// Manual Query Invalidation Patch for Real-time Updates
// Add this code after line 499 in the processQRScan function

// MANUAL QUERY INVALIDATION FOR REAL-TIME UPDATES
console.log("🔄 [REAL-TIME] Invalidating queries for real-time updates...");

// Invalidate additional fields queries to trigger UI refresh
queryClient.invalidateQueries({
  queryKey: ["additionalFields", cardId],
});

// Also invalidate card detail queries in case they depend on additional field data
queryClient.invalidateQueries({
  queryKey: ["cards", "detail", cardId],
});

console.log("🔄 [REAL-TIME] Query invalidation completed");

// This should be added right after:
// message.success(response.message || "Item scanned successfully!");
// and before:
// // Refetch the data from backend and reload into store