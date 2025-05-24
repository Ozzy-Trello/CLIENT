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
} from "antd";
import { useRef, useState } from "react";
import Cover from "./cover";
import { useCardDetailContext } from "@providers/card-detail-context";
import { Eye } from "lucide-react";
import MembersList from "@components/members-list";
import Description from "./description";
import Attachments from "./attachments";
import Activity from "./activity";
import { useSelector } from "react-redux";
import { selectUser } from "@store/app_slice";
import Actions from "./actions";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import CustomFields from "./custom-field";
import { ListSelection, SelectionRef } from "@components/selection";
import { useCards } from "@hooks/card";
import { useLists } from "@hooks/list";
import { useCardActivity } from "@hooks/card_activity";
import LocationDisplay from "./location";
import AdditionalFields from "./additional-field";
import RequestFields from "./request-field";
import CardTimeInList from "./time-in-lists";
import ChecklistFields from "./checklist-field";

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
  } = useCardDetailContext();
  const currentUser = useSelector(selectUser);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const { customFields } = useCustomFields(workspaceId || "");
  const listSelectionRef = useRef<SelectionRef>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const { updateCard } = useCards(selectedCard?.listId || "", boardId);
  const { cardActivities } = useCardActivity(selectedCard?.id || "");
  const { lists } = useLists(boardId || "");
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);

  const onCardComplete: CheckboxProps["onChange"] = (e) => {
    e.stopPropagation();
    const isChecked = e.target.checked;
    setIsComplete(isChecked);

    // If checked, move the card to next list
    if (isChecked && selectedCard) {
      // Find the current list index
      const currentListIndex = lists.findIndex(
        (list) => list.id === selectedCard.listId
      );

      // Get the next list if it exists
      if (currentListIndex !== -1 && currentListIndex < lists.length - 1) {
        const nextListId = lists[currentListIndex + 1].id;

        // Move card to next list
        updateCard({
          cardId: selectedCard.id,
          updates: {
            listId: nextListId,
          },
          listId: selectedCard.listId,
          destinationListId: nextListId,
        });
      }
    }
  };

  const handleSaveTitleClick = () => {
    if (!selectedCard) return;

    console.log("Saving title:", newTitle);
    updateCard(
      {
        cardId: selectedCard.id,
        updates: {
          listId: selectedCard.listId,
          name: newTitle,
        },
        listId: selectedCard.listId,
        destinationListId: selectedCard.listId,
      },
      {
        onSuccess: (data) => {
          console.log("Title update successful:", data);
          if (setSelectedCard) {
            setSelectedCard({
              ...selectedCard,
              name: newTitle,
            });
          }
          setIsEditingTitle(false);
        },
        onError: (error) => {
          console.error("Title update failed:", error);
        },
      }
    );
  };

  const onListChange = (value: string, option: object) => {
    console.log("List changed to: ", value, option);
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

  return (
    <Modal
      title={null}
      open={isCardDetailOpen}
      onCancel={closeCardDetail}
      footer={null}
      className="modal-card-form"
      style={{ top: 20 }}
      width={770}
      destroyOnClose
    >
      <div className="overflow-x-hidden max-w-full">
        {/* Cover Image Section */}
        {selectedCard && <Cover card={selectedCard} />}

        <div className="p-5">
          <Row>
            <Col flex="0 1 75%">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  className="custom-circular-checkbox"
                  onChange={onCardComplete}
                  onClick={(e) => e.stopPropagation()}
                  checked={isComplete}
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
                    className="text-5xl font-bold mb-0 ml-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md"
                    onClick={() => {
                      setNewTitle(selectedCard?.name || "");
                      setIsEditingTitle(true);
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
                    />
                  </div>

                  <Button
                    icon={<Eye size={14} />}
                    size="small"
                    className="rounded-md hover:bg-gray-50"
                  />
                </div>

                {/* Members & Labels Section */}
                <div className="flex flex-wrap gap-y-4">
                  <div className="w-full md:w-1/2 pr-2">
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Members
                      </span>
                      <div>
                        <MembersList
                          members={selectedCard?.members || []}
                          membersLength={selectedCard?.members?.length || 0}
                          membersLoopLimit={3}
                          openAddMember={openAddMember}
                          setOpenAddMember={setOpenAddMember}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/2">
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">
                        Labels
                      </span>
                      <Flex gap="small" wrap="wrap">
                        {selectedCard?.labels?.map((label, index) => (
                          <Tag
                            key={index}
                            color={label.color}
                            className="rounded-md py-1"
                          >
                            {label.title}
                          </Tag>
                        ))}
                        <Tag
                          className="cursor-pointer rounded-md border-dashed hover:bg-gray-50"
                          // onClick={() => setLabelModalVisible(true)}
                        >
                          +
                        </Tag>
                        {/* <LabelsSelection
                          visible={labelModalVisible}
                          onClose={() => setLabelModalVisible(false)}
                          onSave={addLabel}
                          initialSelectedLabels={[]}
                        /> */}
                      </Flex>
                    </div>
                  </div>
                </div>

                {/* Notifications & Time Tracking */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="space-y-2 text-xs">
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
                  </div>

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
                </div>
              </div>

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

              {selectedCard && customFields && (
                <CustomFields customFields={customFields} />
              )}

              <AdditionalFields />
              <RequestFields />
              {selectedCard && (
                <CardTimeInList card={selectedCard} setCard={setSelectedCard} />
              )}

              {/* Checklist Section */}
              {selectedCard && <ChecklistFields />}

              {/* Attachments Section */}
              {selectedCard && (
                <Attachments
                  card={selectedCard}
                  setCard={setSelectedCard}
                  currentUser={currentUser}
                />
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
                <Activity
                  activities={cardActivities || []}
                  currentUser={currentUser}
                  card={selectedCard}
                  setCard={setSelectedCard}
                />
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
