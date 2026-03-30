'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import URLShortener from '@utils/url-shortener';
import { cardDetails, getCardByShortId } from '@api/card';
import { Spin, message } from 'antd';

/**
 * QR Code Redirect Page
 * Resolves short URLs back to full card URLs with cardId preserved
 */
export default function QRRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const shortId = params.shortId as string;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shortId) {
      console.log('[SHORTURL LOG] No shortId provided, redirecting to home');
      router.push('/');
      return;
    }

    const resolveShortId = async () => {
      try {
        console.log('[SHORTURL LOG] Starting resolution for shortId:', shortId);
        
        // First try to parse as numeric shortId (new backend system)
        const numericShortId = parseInt(shortId, 10);
        console.log('[SHORTURL LOG] Parsed numeric shortId:', numericShortId, 'isValid:', !isNaN(numericShortId));
        
        if (!isNaN(numericShortId)) {
          try {
            console.log('[SHORTURL LOG] Attempting backend API call for shortId:', numericShortId);
            const response = await getCardByShortId(numericShortId);
            console.log('[SHORTURL LOG] Backend API response:', response);
            
            if (response.data) {
              const card: any = response.data;
              
              // Debug: Log the complete card object structure
              console.log('[SHORTURL LOG] Complete card object:', card);
              console.log('[SHORTURL LOG] Card object keys:', Object.keys(card));
              
              console.log('[SHORTURL LOG] Card data received:', {
                id: card.id,
                name: card.name,
                workspaceId: card.workspaceId,
                boardId: card.boardId,
                listId: card.listId,
                // Also check snake_case versions
                workspace_id: card.workspace_id,
                board_id: card.board_id,
                list_id: card.list_id
              });
              
              // Try both camelCase and snake_case versions (backend returns snake_case)
              let workspaceId =
                card.workspace_id ||
                card.workspaceId ||
                card.workspaceInfo?.id ||
                card.boardInfo?.workspaceId ||
                card.boardInfo?.workspace_id;
              let boardId =
                card.board_id ||
                card.boardId ||
                card.boardInfo?.id ||
                card.listInfo?.boardId ||
                card.listInfo?.board_id;
              let listId = card.list_id || card.listId || card.listInfo?.id;

              if ((!workspaceId || !boardId) && card.id) {
                try {
                  const detail = await cardDetails(card.id, boardId || '');
                  const detailedCard = detail?.data as any;
                  workspaceId =
                    workspaceId ||
                    detailedCard?.workspace_id ||
                    detailedCard?.workspaceId ||
                    detailedCard?.workspaceInfo?.id ||
                    detailedCard?.boardInfo?.workspace_id ||
                    detailedCard?.boardInfo?.workspaceId;
                  boardId =
                    boardId ||
                    detailedCard?.board_id ||
                    detailedCard?.boardId ||
                    detailedCard?.boardInfo?.id ||
                    detailedCard?.listInfo?.board_id ||
                    detailedCard?.listInfo?.boardId;
                  listId =
                    listId ||
                    detailedCard?.list_id ||
                    detailedCard?.listId ||
                    detailedCard?.listInfo?.id;
                } catch (detailError) {
                  console.warn('[SHORTURL LOG] Fallback card detail lookup failed:', detailError);
                }
              }
              
              console.log('[SHORTURL LOG] Resolved IDs:', {
                workspaceId,
                boardId,
                listId
              });
              
              // Use the resolved IDs
              if (workspaceId && boardId && listId) {
                const fullUrl = `/workspace/${workspaceId}/board/${boardId}?listId=${listId}&cardId=${card.id}`;
                console.log('[SHORTURL LOG] Redirecting to:', fullUrl);
                router.push(fullUrl);
                return;
              } else {
                console.warn('[SHORTURL LOG] Missing required IDs in response:', {
                  workspaceId,
                  boardId,
                  listId,
                  cardData: {
                    workspace_id: card.workspace_id,
                    board_id: card.board_id,
                    list_id: card.list_id,
                    workspaceId: card.workspaceId,
                    boardId: card.boardId,
                    listId: card.listId
                  }
                });
              }
            } else {
              console.warn('[SHORTURL LOG] No data in backend response');
            }
          } catch (error) {
            console.warn('[SHORTURL LOG] Backend shortId lookup failed:', error);
          }
        }

        // Fallback to legacy URLShortener system
        console.log('[SHORTURL LOG] Falling back to legacy URLShortener system');
        const resolved = URLShortener.resolveShortUrl(shortId);
        console.log('[SHORTURL LOG] Legacy system result:', resolved);
        
        if (resolved) {
          // Redirect to the full URL with cardId
          const fullUrl = `/workspace/${resolved.workspaceId}/board/${resolved.boardId}?cardId=${resolved.cardId}`;
          console.log('[SHORTURL LOG] Legacy redirect to:', fullUrl);
          router.push(fullUrl);
        } else {
          // Short URL not found, redirect to home
          console.error('[SHORTURL LOG] Short URL not found in any system');
          message.error('QR code not found or expired');
          router.push('/');
        }
      } catch (error) {
        console.error('[SHORTURL LOG] Error resolving short URL:', error);
        message.error('Failed to resolve QR code');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    resolveShortId();
  }, [shortId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">Redirecting to card...</p>
      </div>
    </div>
  );
}
