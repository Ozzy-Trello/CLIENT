import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import camelcaseKeys from "camelcase-keys";

// Custom hook to manage WebSocket connection
export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Make sure the WebSocket URL is correctly formatted
    const wsUrl = process.env.NEXT_PUBLIC_BE_BASE_URL?.replace('http', 'ws') + '/ws';
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setSocket(ws);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  return { socket, isConnected };
}

// Hook to handle WebSocket card updates with query invalidation
export function useWebSocketCardUpdates(socket: WebSocket | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        let message = JSON.parse(event.data);
        message = camelcaseKeys(message, { deep: true });
        console.log("WebSocket message received:", message);

        switch (message.event) {
          case "connection":
            console.log("WebSocket connection confirmed:", message.data.message);
            break;
            
          case "card:moved":
            const { card, fromListId, toListId } = message.data;
            console.log(`Card ${card.id} moved from ${fromListId} to ${toListId}`);
            
            // invalidate all related queries
            queryClient.invalidateQueries({ queryKey: ["lists"] });
            queryClient.invalidateQueries({ queryKey: ["cards", fromListId] });
            if (fromListId !== toListId) {
              queryClient.invalidateQueries({ queryKey: ["cards", toListId] });
            }
            break;
            
          case "card:updated":
            const { card: updatedCard, listId } = message.data;
            console.log(`Card ${updatedCard.id} updated in list ${listId}`);
            
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["lists"] });
            queryClient.invalidateQueries({ queryKey: ["cards", listId] });
            break;
            
          case "card:created":
            const { card: newCard, listId: newCardListId } = message.data;
            console.log(`New card ${newCard.id} created in list ${newCardListId}`);
            
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["lists"] });
            queryClient.invalidateQueries({ queryKey: ["cards", newCardListId] });
            break;
            
          case "card:deleted":
            const { cardId: deletedCardId, listId: deletedCardListId } = message.data;
            console.log(`Card ${deletedCardId} deleted from list ${deletedCardListId}`);
            
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ["lists"] });
            queryClient.invalidateQueries({ queryKey: ["cards", deletedCardListId] });
            break;
            
          default:
            console.log("Unknown WebSocket event:", message.event);
        }
      } catch (e) {
        console.error("Invalid WebSocket data:", e);
      }
    };

    socket.addEventListener("message", handleMessage);
    
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, queryClient]);
}

export function useRealtimeUpdates() {
  const { socket, isConnected } = useWebSocket();
  useWebSocketCardUpdates(socket);
  
  return { socket, isConnected };
}