// Quilt landing — small touches of life.

(function() {
  // Animate the demo grid — randomly flash cells to simulate live updates
  const cells = document.querySelectorAll('.cell.flash, .cell.val');

  if (cells.length === 0) return;

  setInterval(() => {
    // Pick a random compass or rudder cell
    const compassCells = document.querySelectorAll('[data-anim="compass"]');
    const rudderCells = document.querySelectorAll('[data-anim="rudder"]');

    const cell = compassCells[Math.floor(Math.random() * compassCells.length)];
    if (cell) {
      cell.classList.add('flash');
      // Random small change
      const current = parseInt(cell.textContent) || 180;
      const next = (current + (Math.random() - 0.5) * 6 + 360) % 360;
      cell.textContent = `${Math.round(next)}°`;

      // Cascade to the rudder cell in the same row
      const row = cell.parentElement;
      const rudder = row.querySelector('[data-anim="rudder"]');
      if (rudder) {
        const err = ((next - 180 + 540) % 360) - 180;
        const cmd = Math.max(-30, Math.min(30, err * 0.5));
        rudder.textContent = `${cmd >= 0 ? '+' : ''}${cmd.toFixed(1)}°`;
      }

      setTimeout(() => cell.classList.remove('flash'), 300);
    }
  }, 800);
})();
