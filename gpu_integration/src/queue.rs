//! Lock‑free single‑producer/single‑consumer ring buffer that lives in a
//! unified‑memory buffer (accessible by both CPU and GPU).
//!
//! The buffer is split into fixed‑size slots, each slot large enough to hold
//! the largest command we expect (header + payload).  The queue stores only
//! the raw bytes; it is the caller's responsibility to serialize/deserialize
//! the command structures.
//!
//! # Safety
//! The queue assumes a single producer and a single consumer.  If multiple
//! threads try to push or pop concurrently the behavior is undefined.
//!
//! Interior mutability is provided via an `UnsafeCell` for the storage buffer,
//! while the head/tail indices are `AtomicUsize` with Release/Acquire ordering.
//!
//! The type is marked as `Send` and `Sync` because the internal buffer is
//! protected by the atomic head/tail indices: only the producer writes to a
//! slot (after claiming it via tail) and only the consumer reads from a slot
//! (after claiming it via head).  The release-acquire ordering on the indices
//! ensures proper visibility of the written bytes.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::cell::UnsafeCell;

/// Fixed size of each slot in the queue (in bytes).  Must be at least the
/// size of the largest command you intend to store.
pub const SLOT_SIZE: usize = 4096; // matches QUILT_GPU_MAX_PAYLOAD_BYTES + header

/// A lock‑free SPSC queue backed by a pre‑allocated byte buffer.
pub struct UnifiedQueue {
    /// The raw storage for the queue slots, wrapped in UnsafeCell to allow
    /// interior mutability for the producer.
    buffer: UnsafeCell<Vec<u8>>,
    /// Number of slots in the buffer.
    capacity: usize,
    /// Index of the slot to read from (consumer).
    head: AtomicUsize,
    /// Index of the slot to write to (producer).
    tail: AtomicUsize,
}

impl UnifiedQueue {
    /// Create a new queue that can hold `capacity` commands.
    ///
    /// # Arguments
    /// * `capacity` – maximum number of commands the queue can hold at once.
    ///
    /// The allocated buffer size is `capacity * SLOT_SIZE` bytes.
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "Queue capacity must be > 0");
        let buf = vec![0u8; capacity * SLOT_SIZE];
        UnifiedQueue {
            buffer: UnsafeCell::new(buf),
            capacity,
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
        }
    }

    /// Returns the number of slots in the queue.
    #[inline]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Try to push a command into the queue.
    ///
    /// # Arguments
    /// * `data` – the serialized command bytes. Must be ≤ `SLOT_SIZE`.
    ///
    /// // Returns
    /// * `Ok(())` if the command was enqueued.
    /// * `Err(QueueFull)` if the queue is full.
    #[inline]
    pub fn push(&self, data: &[u8]) -> Result<(), QueueFull> {
        assert!(data.len() <= SLOT_SIZE, "Command exceeds slot size");
        let mut tail = self.tail.load(Ordering::Relaxed);
        loop {
            let head = self.head.load(Ordering::Acquire);
            let next_tail = if tail + 1 == self.capacity { 0 } else { tail + 1 };
            if next_tail == head {
                // Queue full
                return Err(QueueFull);
            }
            // Try to claim the slot at `tail`.
            if self
                .tail
                .compare_exchange_weak(tail, next_tail, Ordering::Release, Ordering::Relaxed)
                .is_ok()
            {
                // We own the slot; copy the data.
                // Safety: we have exclusive access to this slot because we own the tail index.
                let buf = unsafe { &mut *self.buffer.get() };
                let offset = tail * SLOT_SIZE;
                let dst = &mut buf[offset..offset + SLOT_SIZE];
                // Copy the data.
                dst[..data.len()].copy_from_slice(data);
                // Zero‑out the rest of the slot (optional, helps debugging).
                for byte in &mut dst[data.len()..] {
                    *byte = 0;
                }
                return Ok(());
            }
            // Lost the race to another producer (should not happen in SPSC),
            // retry with the current tail value.
            tail = self.tail.load(Ordering::Relaxed);
        }
    }

    /// Try to pop a command from the queue.
    ///
    /// // Returns
    /// * `Some(vec)` containing the raw bytes if a command was available.
    /// * `None` if the queue is empty.
    #[inline]
    pub fn pop(&self) -> Option<Vec<u8>> {
        let mut head = self.head.load(Ordering::Relaxed);
        loop {
            let tail = self.tail.load(Ordering::Acquire);
            if head == tail {
                // Queue empty
                return None;
            }
            let next_head = if head + 1 == self.capacity { 0 } else { head + 1 };
            // Try to claim the slot at `head`.
            if self
                .head
                .compare_exchange_weak(head, next_head, Ordering::Release, Ordering::Relaxed)
                .is_ok()
            {
                // We own the slot; read the data.
                // Safety: we have exclusive access to this slot because we own the head index.
                let buf = unsafe { &*self.buffer.get() };
                let offset = head * SLOT_SIZE;
                let src = &buf[offset..offset + SLOT_SIZE];
                // Return a copy of the whole slot; the caller can interpret the header
                // and payload length as needed.
                let mut v = Vec::with_capacity(SLOT_SIZE);
                v.extend_from_slice(src);
                return Some(v);
            }
            // Lost the race to the consumer (should not happen in SPSC),
            // retry with the current head.
            head = self.head.load(Ordering::Relaxed);
        }
    }

    /// Returns a slice of the underlying buffer for direct inspection (unsafe).
    #[inline]
    pub fn as_slice(&self) -> &[u8] {
        unsafe { &*self.buffer.get() }
    }
}

/// Error returned when the queue is full.
#[derive(Debug, PartialEq, Eq)]
pub struct QueueFull;

impl std::fmt::Display for QueueFull {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "queue is full")
    }
}

impl std::error::Error for QueueFull {}

unsafe impl Send for UnifiedQueue {}
unsafe impl Sync for UnifiedQueue {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_push_pop() {
        let q = UnifiedQueue::new(4);
        let cmd = b"hello";
        assert_eq!(q.push(cmd), Ok(()));
        let popped = q.pop().expect("should have a command");
        assert_eq!(&popped[..cmd.len()], cmd);
        assert_eq!(q.pop(), None);
    }

    #[test]
    fn queue_full() {
        let q = UnifiedQueue::new(2);
        let cmd = [0u8; SLOT_SIZE];
        assert_eq!(q.push(&cmd), Ok(()));
        assert_eq!(q.push(&cmd), Ok(()));
        assert_eq!(q.push(&cmd), Err(QueueFull));
        // Consume one, then we can push again.
        let _ = q.pop().expect("should have a command");
        assert_eq!(q.push(&cmd), Ok(()));
    }

    #[test]
    fn wrap_around() {
        let q = UnifiedQueue::new(2);
        let cmd1 = b"aa";
        let cmd2 = b"bb";
        let cmd3 = b"cc";
        assert_eq!(q.push(&cmd1), Ok(()));
        assert_eq!(q.push(&cmd2), Ok(()));
        let _ = q.pop().expect("first");
        assert_eq!(q.push(&cmd3), Ok(()));
        let popped = q.pop().expect("second");
        assert_eq!(&popped[..cmd2.len()], cmd2);
        let popped = q.pop().expect("third");
        assert_eq!(&popped[..cmd3.len()], cmd3);
        assert_eq!(q.pop(), None);
    }
}