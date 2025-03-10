import {
  Avatar,
  Button,
  Col,
  Input,
  List,
  Modal,
  Row,
  Skeleton,
  Space,
  Tooltip,
  Typography,
  Checkbox,
  Dropdown,
  Flex,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import {
  DownOutlined,
  UploadOutlined,
  EllipsisOutlined,
  ExportOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import "./style.css";
import RichTextEditor from "../rich-text-editor";
import { Attachment, Card, Label } from "@/app/dto/types";
import useTaskService from "@/app/hooks/task";
import CustomFieldsSection from "./custom_fields";
import AttachmentsSection from "./attachments";
import ActivitySection from "./activity";
import ActionsSection from "./actions";
import MembersList from "../members-list";
import LabelsSelection from "../selection/label-selection";
import UploadModal from "../modal-upload/modal-upload";
import { generateId } from "@/app/utils/general";
import { url } from "inspector";

interface ModalCardFormProps {
  card: Card;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading?: boolean;
}

const ModalCardForm: React.FC<ModalCardFormProps> = (props) => {
  const { open, setOpen, loading = false, card } = props;
  const [data, setData] = useState<Card | null>(null);
  const { currentUser } = useTaskService();
  const { taskService } = useTaskService();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDesription] = useState("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [comment, setComment] = useState("");
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState({
    priority: "",
    branch: "WBT",
    dealMaker: "Lenni Luvita Dewi",
    designType: "",
    product: "Custom Kemeja",
    variant: "KMB",
    printType: "Bordir",
    material: "Nagata Drill",
    color: "UNGU MIX HITAM",
    designer: "Raka",
    revision: false,
    sentToDM: true,
    designApproved: true,
  });

  useEffect(() => {
    // Check for stored image in localStorage
    const storedImage = localStorage.getItem("uploadedImage");
    const storedImageName = localStorage.getItem("uploadedImageName");

    if (storedImage && storedImageName) {
      setStoredImageUrl(storedImage);

      // Only apply stored image if:
      // 1. The card doesn't have a cover image yet
      // 2. The card is not newly created (check if it has a valid ID that's not temporary)
      // 3. The modal is open
      if (!card.cover && open && !card.id.includes('temp-') && !card.isNew) {
        const attachment: Attachment = {
          id: generateId(),
          filename: storedImageName,
          url: storedImage,
          type: "image",
          addedAt: new Date().toISOString(),
          isCover: true,
        };
        taskService.updateCardDetails(card.id, { cover: attachment });
      }
    }
  }, [card.id, card.cover, open, taskService]);

  useEffect(() => {
    if (open) {
      // Fetch card data
      setData(card);
      setIsFetching(false);
    }
  }, [card, open]);

  const handleSaveCommentClick = () => {
    disableEditComment();
  };

  const onUploadComplete = (imageUrl: string, filename: string) => {
    const attachment: Attachment = {
      id: generateId(),
      filename: filename,
      url: imageUrl,
      type: "image",
      addedAt: new Date().toISOString(),
      isCover: true,
    };
    taskService.updateCardDetails(card.id, { cover: attachment });
    setUploadModalVisible(false);
  };

  const handleCloseModal = () => {
    // Clear the isNew flag if this was a new card
    if (card.isNew) {
      taskService.updateCardDetails(card.id, { isNew: false });
      
      // For new cards, clear any stored image data to avoid reusing it for the next new card
      try {
        localStorage.removeItem('uploadedImage');
        localStorage.removeItem('uploadedImageName');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
    
    // Close the modal
    setOpen(false);
  };

  const addLabel = (selectedLabels: Label[]) => {
    taskService.updateCardDetails(card.id, { labels: selectedLabels });
  };

  const enableEditDescription = () => {
    setIsEditingDescription(true);
  };

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  };

  const handleSaveDescriptionClick = () => {
    taskService.updateCardDescription(card.id, newDescription);
    setIsEditingDescription(false);
  };

  const enableEditComment = () => {
    setIsEditingComment(true);
  };

  const disableEditComment = () => {
    setIsEditingComment(false);
  };

  const timeReport = [
    { list: "Revisi Desain", time: "34 minutes" },
    { list: "Terkirim ke DM", time: "22 hours" },
    { list: "Desain Terambil", time: "8 minutes" },
    { list: "Revisi Desain", time: "1 hour" },
    { list: "Terkirim ke DM", time: "18 hours" },
    { list: "Revisi Desain", time: "6 minutes" },
  ];

  const renderTimeReport = () => {
    return (
      <div className="time-report-section">
        <div className="section-header">
          <span className="section-icon">
            <i className="fi fi-rr-time-past"></i>
          </span>
          <Typography.Title level={5} className="m-0">
            Card time by list
          </Typography.Title>
        </div>

        <List
          className="time-report-list"
          dataSource={timeReport}
          renderItem={(item) => (
            <List.Item className="time-report-item">
              <div className="list-name">
                <div
                  className={`list-indicator ${
                    item.list.includes("Terkirim")
                      ? "blue"
                      : item.list.includes("Revisi")
                      ? "green"
                      : "orange"
                  }`}
                ></div>
                {item.list}
              </div>
              <div className="time-value">{item.time}</div>
            </List.Item>
          )}
        />
      </div>
    );
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleCloseModal}
      footer={null}
      className="modal-card-form"
      style={{ top: 20 }}
      width={750}
      destroyOnClose
    >
      <div className="card-details-container">
        {/* Cover Image Section */}
        <div
          className="cover-section bg-gray-200 bg-contain bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${card.cover?.url}")`,
            display: "flex",
            justifyContent: "end",
            alignItems: "end",
          }}
        >
          <Button
            icon={<UploadOutlined />}
            size="small"
            className="cover-button"
            onClick={() => {
              setUploadModalVisible(true);
            }}
          >
            Cover
          </Button>
          <UploadModal
            isVisible={uploadModalVisible}
            onClose={() => setUploadModalVisible(false)}
            onUploadComplete={onUploadComplete}
            initialImageUrl={storedImageUrl}
          />
        </div>

        <Row gutter={20} className="card-content-row">
          {/* Main Content Column */}
          <Col xs={20} md={17} className="main-content-column">
            {isFetching ? (
              <Skeleton active paragraph={{ rows: 10 }} />
            ) : (
              <>
                {/* Card Title Section */}
                <div className="card-title-section">
                  <div className="section-header">
                    <span className="section-icon">
                      <i className="fi fi-rs-credit-card"></i>
                    </span>
                    <Typography.Title level={4} className="card-title">
                      {data?.title || "PEMUDA GMIT"}
                    </Typography.Title>
                  </div>

                  <div className="card-metadata">
                    {/* in list section */}
                    <div className="list-info">
                      <span className="info-label">in list</span>
                      <Dropdown
                        menu={{
                          items: [
                            { key: "1", label: "Terkirim ke DM" },
                            { key: "2", label: "Revisi Desain" },
                            { key: "3", label: "Desain Terambil" },
                          ],
                        }}
                        trigger={["click"]}
                      >
                        <Button className="list-button">
                          TERKIRIM KE DM <DownOutlined />
                        </Button>
                      </Dropdown>
                      <Button
                        icon={<EyeOutlined />}
                        size="small"
                        className="watch-button"
                      />
                    </div>

                    {/* members and tag section */}
                    <div className="card-members">
                      <div className="members-section">
                        <span className="info-label">Members</span>
                        <MembersList
                          members={card.members}
                          membersLength={card?.members?.length}
                          membersLoopLimit={3}
                        />
                      </div>

                      {/* Labels Section */}
                      <div className="labels-section">
                        <span className="info-label">Labels</span>
                        <div className="labels-container">
                          <Flex gap="1px 0">
                            {card?.labels?.map((label, index) => (
                              <Tag color={label.color}>{label.title}</Tag>
                            ))}
                            <Tag
                              className="cursor-pointer"
                              onClick={() => setLabelModalVisible(true)}
                            >
                              +
                            </Tag>
                            <LabelsSelection
                              visible={labelModalVisible}
                              onClose={() => setLabelModalVisible(false)}
                              onSave={addLabel}
                              initialSelectedLabels={[]}
                            />
                          </Flex>
                        </div>
                      </div>
                    </div>

                    {/*  */}
                    <Flex gap={16}>
                      <div className="notifications-section">
                        <span className="info-label">Notifications</span>
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          className="notification-button"
                        >
                          Watch
                        </Button>
                      </div>

                      <div className="notifications-section">
                        <span className="info-label">Time in List</span>
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          className="notification-button"
                        >
                          {card.time.inList}
                        </Button>
                      </div>

                      <div className="notifications-section">
                        <span className="info-label">Time on Board</span>
                        <Button
                          icon={<EyeOutlined />}
                          size="small"
                          className="notification-button"
                        >
                          {card.time.onBoard}
                        </Button>
                      </div>
                    </Flex>
                  </div>
                </div>

                {/* Description Section */}
                <div className="description-section">
                  <div className="section-header">
                    <span className="section-icon">
                      <i className="fi fi-rr-symbol"></i>
                    </span>
                    <Typography.Title level={5} className="m-0">
                      Description
                    </Typography.Title>
                    {!isEditingDescription && (
                      <Button
                        type="default"
                        size="small"
                        onClick={enableEditDescription}
                        className="edit-button"
                      >
                        Edit
                      </Button>
                    )}
                  </div>

                  {isEditingDescription ? (
                    <div className="description-editor">
                      <RichTextEditor
                        initialValue={card?.description ? card.description : ""}
                        onChange={(content: string) => {
                          setNewDesription(content);
                        }}
                        placeholder="description..."
                        height="150px"
                        className="w-full"
                      />
                      <div className="flex justify-end p-2 bg-gray-50 border-t">
                        <Button
                          onClick={disableEditDescription}
                          size="middle"
                          className="mr-2 rounded-md"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="primary"
                          onClick={handleSaveDescriptionClick}
                          size="middle"
                          className="rounded-md bg-black"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="description-content"
                      onClick={enableEditDescription}
                    >
                      {card.description ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: card.description }}
                        />
                      ) : (
                        "description..."
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Fields Section */}
                {card?.customFields && (
                  <CustomFieldsSection
                    customFields={card?.customFields}
                    cardId={card.id}
                  />
                )}

                {/* Time Report Section */}
                {renderTimeReport()}

                {/* Attachments Section */}
                {card?.attachments && (
                  <AttachmentsSection attachments={card?.attachments} />
                )}

                {/* Activity Section */}
                {card?.activity && currentUser && (
                  <ActivitySection
                    activities={card?.activity}
                    currentUser={currentUser}
                    card={card}
                  />
                )}
              </>
            )}
          </Col>

          {/* Sidebar Column */}
          <Col xs={20} md={3} className="sidebar-column">
            {isFetching ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <ActionsSection />
            )}
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default ModalCardForm;
