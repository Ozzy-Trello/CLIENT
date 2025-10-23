import {
  Button,
  Checkbox,
  CheckboxProps,
  Col,
  Dropdown,
  Flex,
  Modal,
  Row,
  Tag,
  Typography,
  Divider,
  Tooltip,
  CheckboxChangeEvent,
} from "antd";
import { useEffect, useRef, useState } from "react";
import Cover from "./cover";
import { useCardDetailContext } from "@providers/card-detail-context";
import {
  Clock,
  Eye,
  Info,
  TimerIcon,
  TextCursorInput,
  ShirtIcon,
  ListRestart,
  CheckSquare,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import MembersList from "@components/members-list";
import Description from "./description";
import Activity from "./activity";
import dynamic from "next/dynamic";

const Attachments = dynamic(() => import("./attachments"), {
  ssr: false,
  loading: () => <div>Loading attachments...</div>,
});

const Actions = dynamic(() => import("./actions"), {
  ssr: false,
  loading: () => <div>Loading actions...</div>,
});

import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import { useParams } from "next/navigation";
import CustomFields from "./custom-field";
import { ListSelection, SelectionRef } from "@components/selection";
import { useCards } from "@hooks/card";
import { useLists } from "@hooks/list";
import { useCardActivity } from "@hooks/card_activity";
import LocationDisplay from "./location";
import ChecklistFields from "./checklist-field";

const AdditionalFields = dynamic(() => import("./additional-field"), {
  ssr: false,
  loading: () => <div>Loading additional fields...</div>,
});
import CardTimeInList from "./time-in-lists";
import RequestFields from "./request-field";
import SplitJobFields from "./split-job-field";
import { CardDateDisplay } from "@components/card-dates";
import { useCardMembers } from "@hooks/card_member";
import PopoverLabel from "@components/popover-label.tsx";
import { CardLabel } from "@myTypes/label";
import { useLabels } from "@hooks/label";
import Dashcard from "./dashcard";
import { useCardDetails } from "@hooks/card-details";
import { LookupCache } from "@utils/lookup-cache";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import POAmount from "./po-amount";
import POSizeAssignment from "./po-size-assignment";
import BahanFields from "./bahan-fields";
import ProdukFields from "./produk-fields";
import CollapsibleSection from "@components/collapsible-section";

const CardDetails: React.FC = (props) => {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const {
    selectedCard,
    setSelectedCard,
    isCardDetailOpen,
    openCardDetail,
    closeCardDetail,
    isLoadingCardDetails,
  } = useCardDetailContext();
  const currentUser = useSelector(selectUser);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const listSelectionRef = useRef<SelectionRef>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const { updateCard } = useCards(selectedCard?.listId || "", boardId);
  const {
    cardMembers,
    addMember,
    isAddingMember,
    refetch: refetchMember,
    removeMember,
  } = useCardMembers(selectedCard?.id || "");
  const { cardLabels, allLabels } = useLabels(
    workspaceId as string,
    selectedCard?.id,
    {
      cardId: selectedCard?.id || "",
    }
  );
  const { cardActivities } = useCardActivity(selectedCard?.id || "");
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [openLabel, setOpenLabel] = useState<boolean>(false);
  const {
    completeCard,
    incompleteCard,
    updateCard: updateCardDetails,
  } = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string
  );

  // Get board permissions
  const { canUpdateCard } = useBoardPermissionsContext();
  console.log(selectedCard, "<< ini selected");
  console.log("isLoadingCardDetails:", isLoadingCardDetails);
  console.log("selectedCard?.bahan:", selectedCard?.bahan);

  const onCompletionChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    if (!canUpdateCard()) {
      return;
    }
    const isComplete = e.target.checked;
    if (isComplete) {
      completeCard({
        listId: selectedCard?.listId || "",
        cardId: selectedCard?.id || "",
      });
    } else {
      incompleteCard({
        listId: selectedCard?.listId || "",
        cardId: selectedCard?.id || "",
      });
    }
  };

  const handleSaveTitleClick = () => {
    if (!selectedCard) return;
    updateCard(
      {
        cardId: selectedCard.id,
        updates: {
          name: newTitle,
        },
      },
      {
        onSuccess: (data) => {
          if (setSelectedCard) {
            setSelectedCard((prevCard) => {
              if (!prevCard) return prevCard;
              return {
                ...prevCard,
                name: newTitle,
              };
            });
          }
          setIsEditingTitle(false);
        },
        onError: (error) => {
          // Title update failed
        },
      }
    );
  };

  const onListChange = (value: string, option: object) => {
    if (!canUpdateCard()) {
      return;
    }
    if (selectedCard) {
      const result = updateCard({
        cardId: selectedCard?.id,
        updates: {
          listId: value,
        },
        listId: selectedCard?.listId,
        destinationListId: value,
      });
    }
  };

  const onUserSelectionChange = (value: string, option: object) => {
    if (!canUpdateCard()) {
      return;
    }
    addMember(value);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!canUpdateCard()) {
      return;
    }
    removeMember(memberId);
  };

  useEffect(() => {
    if (isAddingMember) {
      refetchMember();
    }
  }, [isAddingMember]);

  // Populate LookupCache with labels data
  useEffect(() => {
    if (allLabels && allLabels.length > 0) {
      LookupCache.rememberMany(
        "label",
        allLabels.map((label: any) => ({
          id: label.id,
          name: label.name,
        }))
      );
    }
  }, [allLabels]);

  return (
    <Modal
      title={null}
      open={isCardDetailOpen}
      onCancel={closeCardDetail}
      footer={null}
      className="modal-card-form full-height-modal"
      width={900}
      destroyOnClose
    >
      <div className="overflow-x-hidden max-w-full">
        {/* Cover Image Section */}
        {selectedCard && <Cover card={selectedCard} />}

        {selectedCard && selectedCard?.mirrorId && (
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-md border border-gray-200 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Info size={20} className="text-yellow-600" />
              <span>
                You are viewing this card outside of its original location
              </span>
            </div>
            <Button
              size="small"
              className="bg-gray-200 text-blue-800 font-medium hover:bg-gray-300 border-none rounded-sm px-3 py-1"
            >
              Remove from this board
            </Button>
          </div>
        )}

        {/* Archived badge */}
        {selectedCard?.archive && (
          <div className="w-full bg-red-100 text-red-800 px-4 py-3 rounded-md text-center font-bold text-base mb-4 border border-red-200 shadow">
            This card is archived
          </div>
        )}

        <div className="p-5">
          <Row>
            <Col flex="0 1 75%">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  className={`custom-circular-checkbox absolute left-0 -ml-6 transition-all duration-300 
                    ${selectedCard?.isComplete ? "completed" : ""} ${
                    !canUpdateCard() ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  checked={selectedCard?.isComplete}
                  disabled={!canUpdateCard()}
                  onChange={(e) => {
                    onCompletionChange(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={handleSaveTitleClick}
                    autoFocus
                    className="font-bold mb-0 ml-2 px-2 py-1 w-full border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitleClick();
                      } else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                      }
                    }}
                  />
                ) : (
                  <h1
                    className={`text-5xl font-bold mb-0 ml-2 px-2 py-1 rounded-md ${
                      canUpdateCard()
                        ? "cursor-pointer hover:bg-gray-50"
                        : "cursor-not-allowed opacity-60"
                    }`}
                    onClick={() => {
                      if (canUpdateCard()) {
                        setNewTitle(selectedCard?.name || "");
                        setIsEditingTitle(true);
                      }
                    }}
                  >
                    {selectedCard?.name}
                  </h1>
                )}
              </div>

              <div className="space-y-3 ml-8">
                <div className="flex items-center space-x-2">
                  {/* List Section */}
                  <div>
                    <span className="text-gray-500 text-sm mr-2">in list</span>
                    <ListSelection
                      ref={listSelectionRef}
                      size="small"
                      width={"fit-content"}
                      value={selectedCard?.listId}
                      onChange={onListChange}
                      disabled={!canUpdateCard()}
                    />
                  </div>

                  {/* <Button
                    icon={<Eye size={14} />}
                    size="small"
                    className="rounded-md hover:bg-gray-50"
                  /> */}
                </div>

                <Flex wrap gap="middle">
                  {/* Members */}
                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">
                      Members
                    </span>
                    <div>
                      <MembersList
                        members={cardMembers || []}
                        membersLength={cardMembers?.length || 0}
                        membersLoopLimit={3}
                        openAddMember={openAddMember && canUpdateCard()}
                        setOpenAddMember={setOpenAddMember}
                        onUserSelectionChange={onUserSelectionChange}
                        onRemoveMember={handleRemoveMember}
                      />
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">
                      Labels
                    </span>
                    <div className="flex gap-1">
                      {cardLabels?.map((label: CardLabel, index: number) => (
                        <Tooltip
                          title={`color: ${label.value}, title: ${label.name}`}
                        >
                          <Tag
                            key={index}
                            color={label.value}
                            className="rounded-md"
                          >
                            {label?.name}
                          </Tag>
                        </Tooltip>
                      ))}

                      <PopoverLabel
                        open={openLabel}
                        setOpen={setOpenLabel}
                        triggerEl={
                          <Tag className="cursor-pointer rounded-md border-dashed hover:bg-gray-50">
                            +
                          </Tag>
                        }
                      />
                    </div>
                  </div>

                  {/* Notifications & Watch */}
                  {/* <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">
                      Notifications
                    </span>
                    <Button
                      icon={<Eye size={14} />}
                      size="small"
                      className="rounded-md hover:bg-gray-50"
                    >
                      Watch
                    </Button>
                  </div> */}

                  {/* Time in List */}
                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">
                      Time in List
                    </span>
                    <Button
                      size="small"
                      className="rounded-md hover:bg-gray-50"
                    >
                      {selectedCard?.timeInLists?.find(
                        (item) => item.listId == selectedCard.listId
                      )?.formattedTimeInList || "0m"}
                    </Button>
                  </div>

                  {/* Time on Board */}
                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">
                      Time on Board
                    </span>
                    <Button
                      size="small"
                      className="rounded-md hover:bg-gray-50"
                    >
                      {selectedCard?.formattedTimeInBoard || "0m"}
                    </Button>
                  </div>

                  {/* Start and Due Dates */}
                  {selectedCard && (
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Dates
                      </span>
                      <Button
                        icon={<Clock size={12} />}
                        size="small"
                        className="rounded-md hover:bg-gray-50"
                      >
                        <CardDateDisplay card={selectedCard} />
                      </Button>
                    </div>
                  )}

                  {/* Produk */}
                  {selectedCard && selectedCard.productInfo && (
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Produk
                      </span>
                      <Button
                        size="small"
                        className="rounded-md hover:bg-gray-50"
                      >
                        {selectedCard.productInfo.name}
                      </Button>
                    </div>
                  )}

                  {/* Warna */}
                  {selectedCard && selectedCard.warnaInfo && (
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Warna
                      </span>
                      <Button
                        size="small"
                        className="rounded-md hover:bg-gray-50"
                      >
                        {selectedCard.warnaInfo.name}
                      </Button>
                    </div>
                  )}

                  {selectedCard && !isLoadingCardDetails && (
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Material Requirements
                      </span>
                      <Checkbox
                        checked={(() => {
                          const checkedValue = selectedCard.bahan || false;
                          console.log(
                            "Checkbox checked value:",
                            checkedValue,
                            "from selectedCard.bahan:",
                            selectedCard.bahan
                          );
                          return checkedValue;
                        })()}
                        onChange={(e: CheckboxChangeEvent) => {
                          if (!canUpdateCard()) return;

                          const newBahanValue = e.target.checked;
                          console.log(
                            "Checkbox onChange - newBahanValue:",
                            newBahanValue
                          );
                          console.log(
                            "Checkbox onChange - current selectedCard.bahan:",
                            selectedCard.bahan
                          );

                          // Update local state immediately for better UX
                          const updatedCard = {
                            ...selectedCard,
                            bahan: newBahanValue,
                          };
                          console.log(
                            "Checkbox onChange - setting updatedCard:",
                            updatedCard
                          );
                          setSelectedCard(updatedCard);
                          updateCardDetails({ bahan: newBahanValue });
                        }}
                        className="text-sm"
                      >
                        Butuh Bahan
                      </Checkbox>
                    </div>
                  )}

                  {selectedCard && (
                    <POAmount
                      card={selectedCard}
                      setSelectedCard={setSelectedCard}
                    />
                  )}

                  {selectedCard && (
                    <POSizeAssignment
                      card={selectedCard}
                      setSelectedCard={setSelectedCard}
                    />
                  )}
                </Flex>
              </div>

              {selectedCard && (
                <CollapsibleSection
                  title="Produk"
                  defaultExpanded={true}
                  icon={
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6" />
                    </svg>
                  }
                >
                  <ProdukFields card={selectedCard} setCard={setSelectedCard} />
                </CollapsibleSection>
              )}

              {selectedCard && (
                <Description
                  card={selectedCard}
                  setSelectedCard={setSelectedCard}
                />
              )}

              {selectedCard &&
                selectedCard?.location &&
                selectedCard?.location != "" && (
                  <LocationDisplay coordinate={selectedCard?.location} />
                )}

              {selectedCard && !selectedCard?.dashConfig && (
                <CollapsibleSection
                  title="Custom Fields"
                  defaultExpanded={true}
                  icon={<TextCursorInput size={18} />}
                >
                  <CustomFields card={selectedCard} setCard={setSelectedCard} />
                </CollapsibleSection>
              )}

              {selectedCard?.type == "dashcard" && (
                <Dashcard card={selectedCard} />
              )}
              {/* 
              {selectedCard?.id && (
                <AdditionalFields cardId={selectedCard.id} />
              )} */}

              {selectedCard?.bahan && (
                <CollapsibleSection
                  title="Bahan Fields"
                  defaultExpanded={false}
                  icon={<ShirtIcon size={18} />}
                >
                  <BahanFields
                    cardId={selectedCard?.id || ""}
                    workspaceId={workspaceId}
                  />
                </CollapsibleSection>
              )}

              <CollapsibleSection
                title="Request Fields"
                defaultExpanded={false}
                icon={
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4L4 20h16L12 4z" />
                  </svg>
                }
              >
                <RequestFields />
              </CollapsibleSection>

              {selectedCard && (
                <CollapsibleSection
                  title="Time in Lists"
                  defaultExpanded={false}
                  icon={<ListRestart size={18} />}
                >
                  <CardTimeInList
                    card={selectedCard}
                    setCard={setSelectedCard}
                  />
                </CollapsibleSection>
              )}

              {/* Split Job Section */}
              {selectedCard && (
                <CollapsibleSection
                  title="Split Job Fields"
                  defaultExpanded={false}
                  icon={<CheckSquare size={18} />}
                >
                  <SplitJobFields
                    card={selectedCard}
                    setCard={setSelectedCard}
                  />
                </CollapsibleSection>
              )}

              {/* Checklist Section */}
              {selectedCard && (
                <CollapsibleSection
                  title="Checklist"
                  defaultExpanded={true}
                  icon={<CheckSquare size={18} />}
                >
                  <ChecklistFields />
                </CollapsibleSection>
              )}

              {/* Attachments Section */}
              {selectedCard && (
                <CollapsibleSection
                  title="Attachments"
                  defaultExpanded={true}
                  icon={<Paperclip size={18} />}
                >
                  <Attachments
                    card={selectedCard}
                    setCard={setSelectedCard}
                    currentUser={currentUser}
                  />
                </CollapsibleSection>
              )}
              {/* {selectedCard?.attachments && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <span className="text-gray-500 mr-2">
                      <i className="fi fi-rs-clip"></i>
                    </span>
                    <Typography.Title level={5} className="m-0">
                      Attachments
                    </Typography.Title>
                  </div>
                  <Attachments attachments={selectedCard?.attachments} />
                </div>
              )} */}

              {/* Activity Section */}
              {selectedCard && (
                <CollapsibleSection
                  title="Activity"
                  defaultExpanded={true}
                  icon={<MessageSquare size={18} />}
                >
                  <Activity
                    currentUser={currentUser}
                    card={selectedCard}
                    setCard={setSelectedCard}
                  />
                </CollapsibleSection>
              )}
            </Col>
            <Col flex="0 1 25%">
              <div className="pl-4">
                <Typography.Title level={5} className="m-0 mb-2 text-gray-700">
                  Actions
                </Typography.Title>
                <Actions />
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </Modal>
  );
};

export default CardDetails;
