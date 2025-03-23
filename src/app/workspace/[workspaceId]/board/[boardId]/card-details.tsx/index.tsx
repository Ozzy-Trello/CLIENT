import UploadModal from "@/app/components/modal-upload/modal-upload";
import { Card } from "@/app/dto/types";
import { Button, Checkbox, CheckboxProps, Col, Dropdown, Flex, Modal, Row, Tag, Typography } from "antd";
import { useState } from "react";
import Cover from "./cover";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { ArrowDown, ChevronDown, Eye, Upload } from "lucide-react";
import MembersList from "@/app/components/members-list";
import LabelsSelection from "@/app/components/selection/label-selection";
import Description from "./description";
import Attachments from "./attachments";
import Activity from "./activity";
import { useSelector } from "react-redux";
import { selectUser } from "@/app/store/app_slice";
import Actions from "./actions";
import { useCustomFields } from "@/app/hooks/custom_field";
import { useParams } from "next/navigation";
import CustomFields from "./custom-fields";

const CardDetails: React.FC = (props) => {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const {selectedCard, setSelectedCard,  isCardDetailOpen, openCardDetail, closeCardDetail } = useCardDetailContext();
  const currentUser = useSelector(selectUser);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const {customFields} = useCustomFields(workspaceId || '');

  const onChange: CheckboxProps['onChange'] = (e) => {
    e.stopPropagation();
    setIsComplete(e.target.checked);
  };
  
  return(
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
                  onChange={onChange} 
                  onClick={(e) => e.stopPropagation()}
                  checked={isComplete}
                />
                <h1 className="text-5xl font-bold mb-0 ml-2">{selectedCard?.name}</h1>
              </div>

              <div className="space-y-3 ml-8">
                {/* List Section */}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">in list</span>
                  <Dropdown
                    menu={{ 
                      items: [
                        { key: '1', label: 'Terkirim ke DM' },
                        { key: '2', label: 'Revisi Desain' },
                        { key: '3', label: 'Desain Terambil' }
                      ] 
                    }}
                    trigger={['click']}
                  >
                    <Button size="small" className="rounded-md border border-gray-300 hover:bg-gray-50 font-medium">
                      TERKIRIM KE DM <ChevronDown size={14} />
                    </Button>
                  </Dropdown>
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
                      <span className="text-gray-300 font-semibold text-xs block">Members</span>
                      <div>
                        <MembersList members={selectedCard?.members || []} membersLength={selectedCard?.members?.length || 0} membersLoopLimit={3} />
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/2">
                    <div className="space-y-2 text-xs">
                      <span className="text-gray-300 font-semibold text-xs block">Labels</span>
                      <Flex gap="small" wrap="wrap">
                        {selectedCard?.labels?.map((label, index) => (
                          <Tag key={index} color={label.color} className="rounded-md py-1">
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
                    <span className="text-gray-300 font-semibold text-xs block">Notifications</span>
                    <Button
                      icon={<Eye size={14} />} 
                      size="small" 
                      className="rounded-md hover:bg-gray-50"
                    >
                      Watch
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">Time in List</span>
                    <Button 
                      size="small" 
                      className="rounded-md hover:bg-gray-50"
                    >
                      {selectedCard?.time?.inList || "0m"}
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-gray-300 font-semibold text-xs block">Time on Board</span>
                    <Button 
                      size="small" 
                      className="rounded-md hover:bg-gray-50"
                    >
                      {selectedCard?.time?.onBoard || "0m"}
                    </Button>
                  </div>
                </div>
              </div>

              {selectedCard && <Description card={selectedCard} />}

              {selectedCard && customFields && (
                <CustomFields customFields={customFields} />
              )}

              {/* Attachments Section */}
              {selectedCard?.attachments && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <span className="text-gray-500 mr-2"><i className="fi fi-rs-clip"></i></span>
                    <Typography.Title level={5} className="m-0">Attachments</Typography.Title>
                  </div>
                  <Attachments attachments={selectedCard?.attachments} />
                </div>
              )}

              {/* Activity Section */}
              {selectedCard && (
                <Activity activities={selectedCard.activity || []} currentUser={currentUser} card={selectedCard} setCard={setSelectedCard} />
              )}

            </Col>
            <Col flex="0 1 25%">
              <div className="pl-4">
                <Typography.Title level={5} className="m-0 mb-2 text-gray-700">Actions</Typography.Title>
                <Actions />
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </Modal>
  )
}

export default CardDetails;