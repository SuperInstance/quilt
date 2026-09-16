#ifndef QUILT_GPU_COMMANDS_H
#define QUILT_GPU_COMMANDS_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Command IDs
typedef enum {
    QUILT_CMD_NOP = 0,
    QUILT_CMD_EDIT_CELL = 1,
    QUILT_CMD_FORMULA_EVAL = 2,
    QUILT_CMD_ADD_ROWS = 3,
    QUILT_CMD_DEL_ROWS = 4,
    QUILT_CMD_ADD_COLS = 5,
    QUILT_CMD_DEL_COLS = 6,
    QUILT_CMD_SET_FORMAT = 7,
    QUILT_CMD_SYNC_CRDT = 8,
    QUILT_CMD_MAX
} quilt_cmd_id_t;

// Shared command header – must match CPU and GPU layout exactly
typedef struct {
    quilt_cmd_id_t id;
    uint32_t       payload_len;  // bytes after this header
    // Followed by variable-length payload (see specific structs below)
} quilt_cmd_header_t;

// ==== Specific command payloads ====

// EDIT_CELL: set a cell's raw value (as string) – for simplicity, we pass index and length+UTF8 bytes
typedef struct {
    uint32_t cell_index;   // linear index in the sheet (row * cols + col)
    uint32_t value_len;    // length of the UTF8 string that follows (not including null)
    // char value[value_len]; // appended after this struct
} quilt_cmd_edit_cell_t;

// FORMULA_EVAL: evaluate a formula over a range of cells
// For now, we assume formula is a null-terminated string stored after the struct.
typedef struct {
    uint32_t start_index;  // first cell index to evaluate (inclusive)
    uint32_t count;        // number of consecutive cells to evaluate
    uint32_t formula_len;  // length of formula string (UTF8, no null)
    // char formula[formula_len];
} quilt_cmd_formula_eval_t;

// ADD_ROWS: insert `count` rows at position `row_index`
typedef struct {
    uint32_t row_index;   // where to insert (0-based)
    uint32_t count;       // number of rows to insert
} quilt_cmd_add_rows_t;

// DEL_ROWS: delete `count` rows starting at `row_index`
typedef struct {
    uint32_t row_index;
    uint32_t count;
} quilt_cmd_del_rows_t;

// Similar for columns (using column index)
typedef struct {
    uint32_t col_index;
    uint32_t count;
} quilt_cmd_add_cols_t;

typedef struct {
    uint32_t col_index;
    uint32_t count;
} quilt_cmd_del_cols_t;

// SET_FORMAT: apply formatting (e.g., bold, color) to a range – simplified as a bitmask
typedef struct {
    uint32_t start_index;
    uint32_t count;
    uint32_t format_mask; // bits defined by frontend
} quilt_cmd_set_format_t;

// SYNC_CRDT: apply a batch of CRDT operations (simplified as raw op bytes)
typedef struct {
    uint32_t op_len;   // length of serialized op buffer that follows
    // char ops[op_len];
} quilt_cmd_sync_crdt_t;

// Maximum payload size we allow in a single command (adjust as needed)
#define QUILT_GPU_MAX_PAYLOAD_BYTES 4096

#ifdef __cplusplus
}
#endif

#endif // QUILT_GPU_COMMANDS_H