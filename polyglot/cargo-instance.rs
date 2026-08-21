// ==============================================================================
// QUILT-BUILD POLYGLOT: CARGO INSTANCE
// ==============================================================================
// 8 PRIMITIVES: Cell, Sheet, Kernel, Runtime, Loader, Executor, Serializer, Debugger
// 7 LAYERS: Interface, Core, Platform, Runtime, Data, Control, Meta
// 9 DIALS: 0=Debug, 1=Trace, 2=Info, 3=Warn, 4=Error, 5=Optimize, 6=Replay, 7=Profile, 8=Batch
// ==============================================================================
// This is a complete, standalone CLI tool for processing quilted data (.qzt files)
// It loads a quilted data file, runs a computational kernel, and outputs the updated state.
// Design: Minimal, safe, fast, and testable.
// ==============================================================================
// Usage: cargo run --release -- <input.qzt> <output.qzt>
// ==============================================================================

use std::fs;
use std::path::Path;

// === CELL: The fundamental data unit ===
#[derive(Debug, Clone, PartialEq)]
pub struct Cell {
    pub id: String,
    pub value: f64,
    pub metadata: Option<String>,
}

impl Cell {
    pub fn new(id: &str, value: f64) -> Self {
        Cell {
            id: id.to_string(),
            value,
            metadata: None,
        }
    }

    pub fn with_metadata(mut self, meta: &str) -> Self {
        self.metadata = Some(meta.to_string());
        self
    }

    pub fn apply_operation(&mut self, op: &dyn Fn(f64) -> f64) {
        self.value = op(self.value);
    }
}

// === SHEET: A grid of Cells ===
#[derive(Debug, Clone, PartialEq)]
pub struct Sheet {
    pub name: String,
    pub cells: Vec<Vec<Cell>>,
}

impl Sheet {
    pub fn new(name: &str, rows: usize, cols: usize) -> Self {
        let mut cells = Vec::with_capacity(rows);
        for _ in 0..rows {
            let row = vec![Cell::new("0", 0.0); cols];
            cells.push(row);
        }
        Sheet { name: name.to_string(), cells }
    }

    pub fn get(&self, row: usize, col: usize) -> Option<&Cell> {
        self.cells.get(row).and_then(|r| r.get(col))
    }

    pub fn set(&mut self, row: usize, col: usize, cell: Cell) {
        if let Some(r) = self.cells.get_mut(row) {
            if let Some(c) = r.get_mut(col) {
                *c = cell;
            }
        }
    }

    pub fn apply_operation(&mut self, op: &dyn Fn(f64) -> f64) {
        for row in self.cells.iter_mut() {
            for cell in row.iter_mut() {
                cell.apply_operation(op);
            }
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = &Cell> {
        self.cells.iter().flatten()
    }
}

// === KERNEL: The computational engine ===
#[derive(Debug, Clone)]
pub struct Kernel {
    pub name: String,
    pub operations: Vec<Box<dyn Fn(f64) -> f64>>,
}

impl Kernel {
    pub fn new(name: &str) -> Self {
        Kernel {
            name: name.to_string(),
            operations: Vec::new(),
        }
    }

    pub fn add_operation(&mut self, op: Box<dyn Fn(f64) -> f64>) {
        self.operations.push(op);
    }

    pub fn run(&self, sheet: &mut Sheet) {
        let mut op_chain = |val: f64| -> f64 {
            let mut result = val;
            for op in &self.operations {
                result = op(result);
            }
            result
        };

        sheet.apply_operation(&op_chain);
    }
}

// === DATA STRUCTURE: Quilted Data Container (QZT) ===
#[derive(Debug, Clone, PartialEq)]
pub struct Qzt {
    pub metadata: std::collections::HashMap<String, String>,
    pub sheets: Vec<Sheet>,
    pub kernel: Kernel,
}

impl Qzt {
    pub fn new() -> Self {
        Qzt {
            metadata: std::collections::HashMap::new(),
            sheets: Vec::new(),
            kernel: Kernel::new("default"),
        }
    }

    pub fn add_sheet(&mut self, sheet: Sheet) {
        self.sheets.push(sheet);
    }

    pub fn get_sheet(&self, name: &str) -> Option<&Sheet> {
        self.sheets.iter().find(|s| s.name == name)
    }

    pub fn get_sheet_mut(&mut self, name: &str) -> Option<&mut Sheet> {
        self.sheets.iter_mut().find(|s| s.name == name)
    }

    pub fn set_kernel(&mut self, kernel: Kernel) {
        self.kernel = kernel;
    }

    pub fn run_kernel(&mut self) {
        self.kernel.run(&mut self.sheets[0]); // Run on first sheet
    }
}

// === LOADER: Reads .qzt files (simple binary format) ===
impl Qzt {
    pub fn load<P: AsRef<Path>>(path: P) -> std::io::Result<Self> {
        let data = fs::read(path)?;
        let mut offset = 0;

        // Read header (magic + version)
        let magic = &data[offset..offset + 4];
        offset += 4;
        if magic != b"QZT1" {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid magic"));
        }

        // Read metadata count
        let meta_count = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        offset += 4;

        let mut metadata = std::collections::HashMap::new();
        for _ in 0..meta_count {
            let key_len = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;
            let key = std::str::from_utf8(&data[offset..offset + key_len as usize])?.to_string();
            offset += key_len as usize;

            let val_len = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;
            let val = std::str::from_utf8(&data[offset..offset + val_len as usize])?.to_string();
            offset += val_len as usize;

            metadata.insert(key, val);
        }

        // Read sheets count
        let sheet_count = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        offset += 4;

        let mut sheets = Vec::new();
        for _ in 0..sheet_count {
            // Read sheet name length
            let name_len = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;
            let name = std::str::from_utf8(&data[offset..offset + name_len as usize])?.to_string();
            offset += name_len as usize;

            // Read dimensions
            let rows = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;
            let cols = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;

            let mut cells = Vec::with_capacity(rows as usize);
            for _ in 0..rows {
                let mut row = Vec::with_capacity(cols as usize);
                for _ in 0..cols {
                    let val = f64::from_le_bytes([
                        data[offset],
                        data[offset + 1],
                        data[offset + 2],
                        data[offset + 3],
                        data[offset + 4],
                        data[offset + 5],
                        data[offset + 6],
                        data[offset + 7],
                    ]);
                    offset += 8;
                    row.push(Cell::new("0", val));
                }
                cells.push(row);
            }

            sheets.push(Sheet { name, cells });
        }

        // Read kernel name
        let kernel_name_len = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        offset += 4;
        let kernel_name = std::str::from_utf8(&data[offset..offset + kernel_name_len as usize])?.to_string();
        offset += kernel_name_len as usize;

        // Read number of operations
        let op_count = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
        offset += 4;

        let mut operations = Vec::new();
        for _ in 0..op_count {
            let op_type = u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]]);
            offset += 4;

            match op_type {
                0 => {
                    // Identity
                    operations.push(Box::new(|x| x) as Box<dyn Fn(f64) -> f64>);
                }
                1 => {
                    // Square
                    operations.push(Box::new(|x| x * x));
                }
                2 => {
                    // Sqrt
                    operations.push(Box::new(|x| x.sqrt()));
                }
                3 => {
                    // Sin
                    operations.push(Box::new(|x| x.sin()));
                }
                4 => {
                    // Log
                    operations.push(Box::new(|x| x.ln()));
                }
                _ => {
                    // Default: Identity
                    operations.push(Box::new(|x| x));
                }
            }
        }

        let kernel = Kernel {
            name: kernel_name,
            operations,
        };

        Ok(Qzt {
            metadata,
            sheets,
            kernel,
        })
    }

    pub fn save<P: AsRef<Path>>(&self, path: P) -> std::io::Result<()> {
        let mut data = Vec::new();

        // Write magic
        data.extend_from_slice(b"QZT1");

        // Write metadata
        let meta_count = self.metadata.len() as u32;
        data.extend_from_slice(&meta_count.to_le_bytes());
        for (k, v) in &self.metadata {
            let k_bytes = k.as_bytes();
            data.extend_from_slice(&(k_bytes.len() as u32).to_le_bytes());
            data.extend_from_slice(k_bytes);

            let v_bytes = v.as_bytes();
            data.extend_from_slice(&(v_bytes.len() as u32).to_le_bytes());
            data.extend_from_slice(v_bytes);
        }

        // Write sheets
        let sheet_count = self.sheets.len() as u32;
        data.extend_from_slice(&sheet_count.to_le_bytes());
        for sheet in &self.sheets {
            let name_bytes = sheet.name.as_bytes();
            data.extend_from_slice(&(name_bytes.len() as u32).to_le_bytes());
            data.extend_from_slice(name_bytes);

            data.extend_from_slice(&(sheet.cells.len() as u32).to_le_bytes());
            data.extend_from_slice(&(sheet.cells[0].len() as u32).to_le_bytes());

            for row in &sheet.cells {
                for cell in row {
                    data.extend_from_slice(&cell.value.to_le_bytes());
                }
            }
        }

        // Write kernel name
        let kernel_name_bytes = self.kernel.name.as_bytes();
        data.extend_from_slice(&(kernel_name_bytes.len() as u32).to_le_bytes());
        data.extend_from_slice(kernel_name_bytes);

        // Write operations
        let op_count = self.kernel.operations.len() as u32;
        data.extend_from_slice(&op_count.to_le_bytes());
        for _ in &self.kernel.operations {
            // Placeholder: only identifying types
            data.extend_from_slice(&0u32.to_le_bytes()); // identity
        }

        fs::write(path, data)
    }
}

// === EXECUTOR: Runs the full pipeline ===
pub struct Executor {
    pub config: std::collections::HashMap<String, String>,
}

impl Executor {
    pub fn new() -> Self {
        Executor {
            config: std::collections::HashMap::new(),
        }
    }

    pub fn run(&self, input_path: &str, output_path: &str) -> std::io::Result<()> {
        let mut qzt = Qzt::load(input_path)?;
        
        // Apply kernel
        qzt.run_kernel();
        
        // Save output
        qzt.save(output_path)?;
        
        Ok(())
    }
}

// === CLI ENTRY POINT ===
fn main() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: {} <input.qzt> <output.qzt>", args[0]);
        return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Invalid arguments"));
    }

    let input_path = &args[1];
    let output_path = &args[2];

    let mut executor = Executor::new();
    executor.run(input_path, output_path)?;

    println!("Successfully processed {} -> {}", input_path, output_path);
    Ok(())
}

// === TESTS ===
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cell_creation() {
        let cell = Cell::new("A1", 42.0);
        assert_eq!(cell.id, "A1");
        assert_eq!(cell.value, 42.0);
        assert_eq!(cell.metadata, None);
    }

    #[test]
    fn test_cell_with_metadata() {
        let cell = Cell::new("A1", 42.0).with_metadata("test");
        assert_eq!(cell.metadata, Some("test".to_string()));
    }

    #[test]
    fn test_cell_operation() {
        let mut cell = Cell::new("A1", 4.0);
        cell.apply_operation(&|x| x * 2.0);
        assert_eq!(cell.value, 8.0);
    }

    #[test]
    fn test_sheet_creation() {
        let sheet = Sheet::new("Sheet1", 2, 3);
        assert_eq!(sheet.name, "Sheet1");
        assert_eq!(sheet.cells.len(), 2);
        assert_eq!(sheet.cells[0].len(), 3);
    }

    #[test]
    fn test_sheet_get_set() {
        let mut sheet = Sheet::new("Sheet1", 1, 1);
        let cell = Cell::new("A1", 10.0);
        sheet.set(0, 0, cell.clone());
        let retrieved = sheet.get(0, 0).unwrap();
        assert_eq!(retrieved.id, "A1");
        assert_eq!(retrieved.value, 10.0);
    }

    #[test]
    fn test_sheet_apply_operation() {
        let mut sheet = Sheet::new("Sheet1", 1, 1);
        sheet.set(0, 0, Cell::new("A1", 5.0));
        sheet.apply_operation(&|x| x + 1.0);
        assert_eq!(sheet.get(0, 0).unwrap().value, 6.0);
    }

    #[test]
    fn test_kernel_add_operations() {
        let mut kernel = Kernel::new("test");
        kernel.add_operation(Box::new(|x| x * 2.0));
        kernel.add_operation(Box::new(|x| x + 1.0));
        assert_eq!(kernel.operations.len(), 2);
    }

    #[test]
    fn test_kernel_run() {
        let mut sheet = Sheet::new("Sheet1", 1, 1);
        sheet.set(0, 0, Cell::new("A1", 5.0));

        let mut kernel = Kernel::new("test");
        kernel.add_operation(Box::new(|x| x * 2.0));
        kernel.add_operation(Box::new(|x| x + 1.0));

        kernel.run(&mut sheet);
        assert_eq!(sheet.get(0, 0).unwrap().value, 11.0);
    }

    #[test]
    fn test_qzt_load_save_roundtrip() {
        let mut qzt = Qzt::new();
        qzt.metadata.insert("author".to_string(), "tester".to_string());
        let mut sheet = Sheet::new("Test", 1, 1);
        sheet.set(0, 0, Cell::new("A1", 10.0));
        qzt.add_sheet(sheet);

        let kernel = Kernel::new("test");
        qzt.set_kernel(kernel);

        // Save
        qzt.save("test.qzt").unwrap();

        // Load
        let loaded = Qzt::load("test.qzt").unwrap();

        assert_eq!(loaded.metadata.get("author").unwrap(), "tester");
        assert_eq!(loaded.sheets[0].name, "Test");
        assert_eq!(loaded.sheets[0].get(0, 0).unwrap().value, 10.0);

        // Clean up
        fs::remove_file("test.qzt").unwrap();
    }

    #[test]
    fn test_executor_run() {
        let mut qzt = Qzt::new();
        let mut sheet = Sheet::new("Test", 1, 1);
        sheet.set(0, 0, Cell::new("A1", 10.0));
        qzt.add_sheet(sheet);

        let mut kernel = Kernel::new("test");
        kernel.add_operation(Box::new(|x| x * 2.0));
        qzt.set_kernel(kernel);

        qzt.save("input.qzt").unwrap();

        let mut executor = Executor::new();
        executor.run("input.qzt", "output.qzt").unwrap();

        let output = Qzt::load("output.qzt").unwrap();
        assert_eq!(output.sheets[0].get(0, 0).unwrap().value, 20.0);

        fs::remove_file("input.qzt").unwrap();
        fs::remove_file("output.qzt").unwrap();
    }
}
