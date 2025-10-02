import React, { useState } from "react";
import {
  Modal,
  Input,
  Button,
  Typography,
  Card,
  Space,
  Tag,
  Empty,
  Spin,
  Alert,
  Divider,
  List,
  Row,
  Col,
  InputNumber,
} from "antd";
import { ShoppingCart, Search, Package, Edit, Plus, QrCode } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { searchCards } from "@api/card";
import { getPOsByCardId, PO, createPO, updatePO } from "@api/po";
import { createShortUrl, buildShortUrl } from "@api/short-url";
import { Card as CardType } from "../../types/card";
import QRCode from "react-qr-code";

interface ModalPOQRProps {
  open: boolean;
  onClose: () => void;
  boardId?: string;
  listId?: string;
}

const { Title, Text } = Typography;
const { Search: AntSearch } = Input;

interface QRCodeData {
  po: PO;
  shortUrl: string;
  qrValue: string;
}

const ModalPOQR: React.FC<ModalPOQRProps> = ({ open, onClose, boardId, listId }) => {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState<boolean>(false);
  const [currentPO, setCurrentPO] = useState<PO | null>(null);
  const [isCreatingPO, setIsCreatingPO] = useState<boolean>(false);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  const queryClient = useQueryClient();

  // Search cards based on search term
  const { data: cardData, isLoading: isLoadingCards, error: cardsError } = useQuery({
    queryKey: ["search-cards", searchTerm],
    queryFn: () => searchCards({ name: searchTerm, description: searchTerm }),
    enabled: open && searchTerm.length > 2,
  });

  // Fetch POs for selected card
  const { data: poData, isLoading: isLoadingPOs, error: poError } = useQuery({
    queryKey: ["pos", selectedCard?.id],
    queryFn: () => getPOsByCardId(selectedCard!.id),
    enabled: !!selectedCard,
  });

  // Update PO mutation
  const updatePOMutation = useMutation({
    mutationFn: ({ poId, updateData }: { poId: string; updateData: { quantity: number } }) =>
      updatePO(poId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", selectedCard?.id] });
      setShowQuantityModal(false);
      setCurrentPO(null);
    },
  });

  // Create PO mutation
  const createPOMutation = useMutation({
    mutationFn: (poData: { card_id: string; po_number: string; quantity: number }) =>
      createPO(poData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", selectedCard?.id] });
      setShowQuantityModal(false);
      setIsCreatingPO(false);
    },
  });

  const cardsList = cardData?.data || [];
  const posList = poData?.data || [];

  const handleCardSelect = (card: CardType) => {
    setSelectedCard(card);
  };

  const handleEditQuantity = (po: PO) => {
    setCurrentPO(po);
    setEditQuantity(po.quantity || 0);
    setShowQuantityModal(true);
  };

  const handleCreateNewPO = () => {
    setCurrentPO(null);
    setEditQuantity(0);
    setIsCreatingPO(true);
    setShowQuantityModal(true);
  };

  const handleSaveQuantity = () => {
    if (currentPO) {
      // Update existing PO
      updatePOMutation.mutate({
        poId: currentPO.id,
        updateData: { quantity: editQuantity }
      });
    } else if (isCreatingPO && selectedCard) {
      // Create new PO
      const poNumber = `PO-${selectedCard.name?.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
      createPOMutation.mutate({
        card_id: selectedCard.id,
        po_number: poNumber,
        quantity: editQuantity
      });
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedCard || posList.length === 0) return;
    
    setIsGeneratingQR(true);
    const generatedQRs: QRCodeData[] = [];
    
    try {
      for (const po of posList) {
        // Build the original URL for this PO
        const originalUrl = `${window.location.origin}/workspace/${workspaceId}/board/${selectedCard.boardId}/card/${selectedCard.id}?po=${po.id}`;
        
        // Create short URL
        const shortUrlResponse = await createShortUrl({
          original_url: originalUrl,
          expires_at: undefined // No expiration for PO QR codes
        });
        
        if (shortUrlResponse.data) {
          const shortUrl = buildShortUrl(shortUrlResponse.data.short_code);
          generatedQRs.push({
            po,
            shortUrl,
            qrValue: shortUrl
          });
        }
      }
      
      setQrCodes(generatedQRs);
    } catch (error) {
      console.error("Error generating QR codes:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCancel = () => {
    setSelectedCard(null);
    setSearchTerm("");
    setCurrentPO(null);
    setIsCreatingPO(false);
    setQrCodes([]);
    setIsGeneratingQR(false);
    onClose();
  };

  const renderCardItem = (card: CardType) => (
    <Card
      key={card.id}
      className="mb-3 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-sm"
      onClick={() => handleCardSelect(card)}
      size="small"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Text strong className="text-gray-800">
              {card.name || "Untitled Card"}
            </Text>
            <Tag color="blue" className="text-xs">
              ID: {card.id.substring(0, 8)}...
            </Tag>
          </div>
          
          {card.description && (
            <Text type="secondary" className="text-sm block mb-2">
              {card.description.length > 100
                ? `${card.description.substring(0, 100)}...`
                : card.description}
            </Text>
          )}
        </div>
      </div>
    </Card>
  );

  const renderPOItem = (po: PO) => (
    <Card key={po.id} className="mb-3" size="small">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-green-600" />
            <Text strong>{po.po_number}</Text>
            <Tag color="green">
              Quantity: {po.quantity || 0}
            </Tag>
          </div>
          
          <Text type="secondary" className="text-xs">
            Created: {new Date(po.created_at).toLocaleDateString()}
          </Text>
        </div>
        
        <Button
          type="link"
          icon={<Edit size={14} />}
          onClick={() => handleEditQuantity(po)}
          size="small"
        >
          Edit Quantity
        </Button>
      </div>
    </Card>
  );

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-green-600" />
            <Title level={4} className="mb-0">
              Generate QR - Purchase Orders
            </Title>
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={
          selectedCard && posList.length > 0 && qrCodes.length === 0 ? (
            <div className="flex justify-between items-center">
              <Text type="secondary" className="text-sm">
                {posList.length} PO(s) ready for QR generation
              </Text>
              <Space>
                <Button onClick={handleCancel} disabled={isGeneratingQR}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={handleGenerateQR}
                  icon={<QrCode size={16} />}
                  className="bg-green-600 hover:bg-green-700"
                  loading={isGeneratingQR}
                  disabled={isGeneratingQR}
                >
                  Generate QR Codes
                </Button>
              </Space>
            </div>
          ) : qrCodes.length > 0 ? (
            <div className="flex justify-end">
              <Space>
                <Button onClick={handleCancel}>Close</Button>
                <Button 
                  type="primary" 
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Print QR Codes
                </Button>
              </Space>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={handleCancel}>Cancel</Button>
            </div>
          )
        }
        width={800}
        centered
        destroyOnClose
      >
        <div className="py-4">
          {qrCodes.length > 0 ? (
            // QR Codes Display Phase
            <>
              <div className="mb-4 p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <Title level={5} className="mb-1">
                      QR Codes Generated Successfully
                    </Title>
                    <Text type="secondary">
                      {qrCodes.length} QR code(s) for {selectedCard?.name}
                    </Text>
                  </div>
                  <Button
                    type="link"
                    onClick={() => setQrCodes([])}
                    size="small"
                  >
                    Generate New
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-96 overflow-y-auto">
                {qrCodes.map((qrData, index) => (
                  <Card key={index} className="text-center">
                    <div className="mb-4">
                      <Title level={5} className="mb-2">
                        PO #{qrData.po.po_number}
                      </Title>
                      <Text type="secondary" className="text-sm">
                        Quantity: {qrData.po.quantity || 0}
                      </Text>
                    </div>
                    
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                        <QRCode
                          value={qrData.qrValue}
                          size={150}
                          level="M"
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 break-all">
                      {qrData.shortUrl}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : !selectedCard ? (
            // Card Search Phase
            <>
              <div className="mb-4">
                <AntSearch
                  placeholder="Search cards by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  prefix={<Search size={16} className="text-gray-400" />}
                  size="large"
                  allowClear
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoadingCards ? (
                  <div className="text-center py-8">
                    <Spin size="large" />
                    <div className="mt-4 text-gray-500">Searching cards...</div>
                  </div>
                ) : cardsError ? (
                  <Alert
                    message="Error loading cards"
                    type="error"
                    className="mb-4"
                  />
                ) : cardsList.length === 0 && searchTerm.length > 2 ? (
                  <Empty
                    description="No cards found matching your search"
                    className="py-8"
                  />
                ) : searchTerm.length <= 2 ? (
                  <Empty
                    description="Enter at least 3 characters to search for cards"
                    className="py-8"
                  />
                ) : (
                  <div>
                    {cardsList.map(renderCardItem)}
                  </div>
                )}
              </div>
            </>
          ) : (
            // PO Management Phase
            <>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <Title level={5} className="mb-1">
                      Selected Card: {selectedCard.name}
                    </Title>
                    <Text type="secondary">
                      ID: {selectedCard.id}
                    </Text>
                  </div>
                  <Button
                    type="link"
                    onClick={() => setSelectedCard(null)}
                    size="small"
                  >
                    Change Card
                  </Button>
                </div>
              </div>

              <Divider orientation="left">
                <div className="flex items-center gap-2">
                  <Package size={16} />
                  Purchase Orders
                </div>
              </Divider>

              {isLoadingPOs ? (
                <div className="text-center py-8">
                  <Spin size="large" />
                  <div className="mt-4 text-gray-500">Loading POs...</div>
                </div>
              ) : poError ? (
                <Alert
                  message="Error loading POs"
                  type="error"
                  className="mb-4"
                />
              ) : (
                <>
                  <div className="mb-4">
                    <Button
                      type="dashed"
                      icon={<Plus size={16} />}
                      onClick={handleCreateNewPO}
                      block
                    >
                      Create New PO
                    </Button>
                  </div>

                  {posList.length === 0 ? (
                    <Empty
                      description="No POs found for this card. Create one to get started."
                      className="py-8"
                    />
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {posList.map(renderPOItem)}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Quantity Edit Modal */}
      <Modal
        title={
          <Title level={4} className="mb-0">
            {isCreatingPO ? "Create New PO" : `Edit PO ${currentPO?.po_number}`}
          </Title>
        }
        open={showQuantityModal}
        onCancel={() => {
          setShowQuantityModal(false);
          setCurrentPO(null);
          setIsCreatingPO(false);
        }}
        footer={
          <Space>
            <Button onClick={() => {
              setShowQuantityModal(false);
              setCurrentPO(null);
              setIsCreatingPO(false);
            }}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handleSaveQuantity}
              disabled={editQuantity <= 0}
            >
              {isCreatingPO ? "Create PO" : "Save Quantity"}
            </Button>
          </Space>
        }
        width={400}
        centered
      >
        <div className="py-4">
          <div className="mb-4">
            <Text strong className="block mb-2">
              Quantity
            </Text>
            <InputNumber
              value={editQuantity}
              onChange={(value) => setEditQuantity(value || 0)}
              min={0}
              className="w-full"
              size="large"
              placeholder="Enter quantity"
            />
          </div>
          
          {editQuantity > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <Text type="secondary">
                Total quantity: <Text strong>{editQuantity}</Text>
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default ModalPOQR;