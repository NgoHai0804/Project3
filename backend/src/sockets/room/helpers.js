// helpers.js
// Helper functions room socket

/** Helper: Format thời gian hiện tại để log */
function now() { 
  return `[${new Date().toISOString().replace("T", " ").split(".")[0]}]`; 
}

/** Helper: Log message với dữ liệu kèm theo */
function log(msg, data = null) { 
  console.log(now(), msg, data ? JSON.stringify(data, null, 2) : ""); 
}

module.exports = {
  now,
  log
};
