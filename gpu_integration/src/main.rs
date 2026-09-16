#![allow(dead_code)]

mod queue; // <-- declare the local queue module

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use queue::{UnifiedQueue, QueueFull};

/// Simulated command processing – in a real GPU kernel this would be the
/// actual work done on the device. For this demo we just count the commands.
fn process_command(_cmd: &[u8]) -> u64 {
    // Pretend we did some work and return a dummy result.
    1
}

/// The persistent kernel loop (runs on a CPU thread for this demo).
///
/// # Arguments
/// * `queue` – reference to the shared queue.
/// * `running` – atomic flag that tells the kernel when to stop.
fn kernel_loop(queue: &UnifiedQueue, running: &AtomicBool) {
    let mut processed = 0u64;
    while running.load(Ordering::Acquire) {
        if let Some(cmd) = queue.pop() {
            // In a real kernel we would interpret the command header and
            // dispatch to the appropriate handler. Here we just count.
            processed += process_command(&cmd);
            // Optional: simulate some work duration.
            // std::thread::sleep(Duration::from_nanos(100));
        } else {
            // Queue empty – spin briefly or yield to reduce CPU usage.
            // Using a short sleep keeps the demo from hogging the CPU.
            thread::sleep(Duration::from_micros(100));
        }
    }
    // When the loop exits we could post a final status, but for demo we just
    // print the total.
    println!("[GPU Kernel] Processed {} commands", processed);
}

/// Demo program that measures the round‑trip latency of pushing N commands
/// through the lock‑free queue and having the kernel thread consume them.
fn main() {
    let capacity = 1024; // number of slots
    let queue = Arc::new(UnifiedQueue::new(capacity));
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = Arc::clone(&running);
    let queue_clone = Arc::clone(&queue);

    // Spawn the kernel thread.
    let handle = thread::spawn(move || {
        kernel_loop(&queue_clone, &running_clone);
    });

    // Number of commands to push in this demo.
    let num_cmds = 100_000;
    // A simple dummy command: just a byte pattern.
    let dummy_cmd = [0u8; 64]; // fits comfortably in SLOT_SIZE (4096)

    let start = Instant::now();
    let mut pushed = 0;
    for i in 0..num_cmds {
        // In a real scenario we would serialize a proper command struct.
        // Here we just push raw bytes.
        match queue.push(&dummy_cmd) {
            Ok(()) => pushed += 1,
            Err(QueueFull) => {
                // If the queue fills up we wait a bit and retry.
                thread::sleep(Duration::from_micros(10));
                // Retry the same command.
                let mut j = i;
                while j < num_cmds {
                    match queue.push(&dummy_cmd) {
                        Ok(()) => {
                            pushed += 1;
                            j += 1;
                        }
                        Err(QueueFull) => {
                            thread::sleep(Duration::from_micros(10));
                        }
                    }
                }
                break;
            }
        }
    }
    let push_duration = start.elapsed();
    println!("[CPU] Pushed {} commands in {:?}", pushed, push_duration);

    // Signal the kernel to stop.
    running.store(false, Ordering::Release);
    // Wait for the kernel thread to finish.
    let _ = handle.join().expect("Kernel thread panicked");

    let total = start.elapsed();
    println!("[CPU] Total elapsed time: {:?}", total);
    println!(
        "[CPU] Throughput: {:.2} commands/sec",
        pushed as f64 / total.as_secs_f64()
    );
}