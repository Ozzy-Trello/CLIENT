"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { 
  CloseOutlined, 
  InfoCircleOutlined,
  PlusOutlined,
  FilterOutlined,
  ArrowRightOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { NextPage } from 'next';
import { CustomFieldSelection, ListSelection, SelectionRef } from '@/app/components/selection';

const { Option } = Select;

const RuleContent: NextPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // 1: Trigger, 2: Action, 3: Review
  const [triggerSelected, setTriggerSelected] = useState(false);
  const [actionSelected, setActionSelected] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [rule, setRule] = useState({
    trigger: "Fields", 
    action: "Move", 
    targetListId: "",
    customFieldId: "",
    customFieldName: ""
  });
  const customFieldSelectionRef = useRef<SelectionRef>(null);
  const listFieldSelectionRef = useRef<SelectionRef>(null);
  
  // Handle closing the page
  const handleClose = () => {
    router.back();
  };

  // Handle saving the rule
  const handleSave = () => {
    // Update rule with latest selection values
    const customField = customFieldSelectionRef.current?.getObject();
    const listField = listFieldSelectionRef.current?.getObject();
    
    // if (!customField?.value) {
    //   messageApi.error("Custom field selection is required");
    //   return;
    // }
    
    // if (rule.action === "Move" && (!listField || !listField.value)) {
    //   messageApi.error("Target list selection is required for Move action");
    //   return;
    // }
    
    // Create a cleaned rule object with properly retrieved values
    const cleanedRule = {
      trigger: rule.trigger,
      action: rule.action,
      customFieldId: customField?.value,
      customFieldName: customField?.label,
      targetListId: listField?.value || ""
    };
    messageApi.info("coming soon");
    console.log("rule is: ", cleanedRule);
    // Implement actual save logic here
    // router.back();
  };

  // Go to next step
  const handleNextStep = () => {
    if (currentStep === 1 && !triggerSelected) {
      setTriggerSelected(true);
      return;
    }
    
    if (currentStep === 2 && !actionSelected) {
      setActionSelected(true);
      return;
    }
    
    if (currentStep < 3) {
      // Update rule with current selections before moving to next step
      if (currentStep === 1) {
        const customField = customFieldSelectionRef.current?.getObject();
        if (customField) {
          setRule(prev => ({
            ...prev,
            customFieldId: customField.value || "",
            customFieldName: typeof customField.label === "string" ? customField.label : ""
          }));
        }
      } else if (currentStep === 2) {
        const listField = listFieldSelectionRef.current?.getObject();
        if (listField) {
          setRule(prev => ({
            ...prev,
            targetListId: listField.value || ""
          }));
        }
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  // Go to previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Select trigger
  const completeSelectTriggerStep = () => {
    setTriggerSelected(true);
  };

  // Select action
  const handleSelectAction = (actionType: string) => {
    setRule((prev) => ({ ...prev, action: actionType }));
    setActionSelected(true);
  };

  // Add new action field
  const handleAddActionField = () => {
    // Logic to add a new action field
  };

  // Update field selection when the refs change
  useEffect(() => {
    if (triggerSelected && customFieldSelectionRef.current) {
      const customField = customFieldSelectionRef.current.getObject();
      if (customField && customField.value) {
        setRule(prev => ({
          ...prev,
          customFieldId: customField.value || "",
          customFieldName: typeof customField.label === 'string' ? customField.label : ""
        }));
      }
    }
  }, [triggerSelected, customFieldSelectionRef.current?.getValue()]);

  useEffect(() => {
    if (actionSelected && listFieldSelectionRef.current) {
      const listField = listFieldSelectionRef.current.getObject();
      if (listField && listField.value) {
        setRule(prev => ({
          ...prev,
          targetListId: listField.value
        }));
      }
    }
  }, [actionSelected, listFieldSelectionRef.current?.getValue()]);

  // Log the current rule state when it changes (for debugging)
  useEffect(() => {
    console.log("Current rule state:", rule);
  }, [rule]);

  // For debugging, log when selection values change
  useEffect(() => {
    console.log("CustomField selection:", customFieldSelectionRef.current?.getObject());
  }, [customFieldSelectionRef.current?.getValue()]);

  useEffect(() => {
    console.log("List selection:", listFieldSelectionRef.current?.getObject());
  }, [listFieldSelectionRef.current?.getValue()]);

  // Render trigger options
  const renderTriggerOptions = () => {
    const options = [
      { key: "Card Move", icon: "→" },
      { key: "Card Changes", icon: "+-" },
      { key: "Dates", icon: "🕒" },
      { key: "Checklists", icon: "✓" },
      { key: "Card Content", icon: "💬" },
      { key: "Fields", icon: "≡" }
    ];

    return (
      <div className="flex space-x-2 mb-6">
        {options.map((option) => (
          <div
            key={option.key}
            className={`p-4 rounded text-center cursor-pointer ${
              rule.trigger === option.key 
                ? "bg-blue-100 border-2 border-blue-500 text-blue-700" 
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => { setRule((prev) => ({ ...prev, trigger: option.key })); }}
          >
            <div className="flex justify-center mb-2">{option.icon}</div>
            <div className="text-sm">{option.key}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render action options
  const renderActionOptions = () => {
    const options = [
      { key: "Move", icon: "→" },
      { key: "Add/Remove", icon: "+-" },
      { key: "Dates", icon: "🕒" },
      { key: "Checklists", icon: "✓" },
      { key: "Members", icon: "👤" },
      { key: "Content", icon: "💬" },
      { key: "Fields", icon: "≡" },
      { key: "Sort", icon: "⇅" },
      { key: "Cascade", icon: "◻" }
    ];

    return (
      <div className="grid grid-cols-6 gap-4 mb-6">
        {options.map((option) => (
          <div
            key={option.key}
            className={`p-4 rounded text-center cursor-pointer ${
              rule.action === option.key 
                ? "bg-blue-100 border-2 border-blue-500 text-blue-700" 
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => handleSelectAction(option.key)}
          >
            <div className="flex justify-center mb-2">{option.icon}</div>
            <div className="text-sm">{option.key}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render integrations
  const renderIntegrations = () => {
    const integrations = [
      { key: "Jira", icon: "J", color: "blue" },
      { key: "Bitbucket", icon: "B", color: "blue" },
      { key: "Slack", icon: "S", color: "gray" }
    ];

    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {integrations.map((integration) => (
          <div
            key={integration.key}
            className="bg-gray-100 p-4 rounded text-center cursor-pointer"
            onClick={() => handleSelectAction(integration.key)}
          >
            <div className="flex justify-center mb-2">
              <span className={`font-bold text-${integration.color}-500`}>{integration.icon}</span>
            </div>
            <div className="text-sm text-gray-700">{integration.key}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {contextHolder}
      <div className="flex flex-col flex-1">
        {/* Page Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Create a Rule</h1>
            <InfoCircleOutlined className="ml-2 text-gray-500" />
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={handleClose} 
            />
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8 flex-grow overflow-y-auto">
          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="mx-2 text-gray-700">Select trigger</div>
              <div className="mx-4 text-gray-400">
                <ArrowRightOutlined />
              </div>
            </div>

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="mx-2 text-gray-700">Select action</div>
              <div className="mx-4 text-gray-400">
                <ArrowRightOutlined />
              </div>
            </div>

            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                3
              </div>
              <div className="mx-2 text-gray-700">Review and save</div>
            </div>
          </div>

          {/* Step 1: Select Trigger */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Trigger</h2>
              
              {!triggerSelected ? (
                <>
                  {renderTriggerOptions()}
                  
                  <div className="mt-8">
                    <Button 
                      type="primary" 
                      size="large"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={completeSelectTriggerStep}
                    >
                      + Add Trigger
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  {/* Custom Fields Trigger UI */}
                  <div className="mb-6">
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="flex-grow">
                          <span className="text-gray-700">when custom fields</span>
                        </div>
                        <div className="flex items-center">
                          <Button type="text" icon={<FilterOutlined />} />
                          <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<PlusOutlined />} 
                            size="small"
                            className="ml-2 bg-blue-600 hover:bg-blue-700" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="flex-grow">
                          <span className="text-gray-700 mr-2">when custom field</span>
                          <CustomFieldSelection ref={customFieldSelectionRef} size="small" width={"fit-content"} />
                          <span className="text-gray-700 ml-2">are completed</span>
                        </div>
                        <div className="flex items-center">
                          <Button type="text" icon={<FilterOutlined />} />
                          <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<PlusOutlined />} 
                            size="small"
                            className="ml-2 bg-blue-600 hover:bg-blue-700" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="primary" 
                      onClick={handleNextStep}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Action */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Action</h2>
              
              {!actionSelected ? (
                <div>
                  {renderActionOptions()}
                  {renderIntegrations()}
                </div>
              ) : (
                <div>
                  {/* Trigger Summary */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Trigger</h3>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-700">when custom fields</span>
                        </div>
                        <Button type="text" icon={<CloseOutlined />} />
                      </div>
                      <div className="mt-2 flex items-center">
                        <div className="bg-white px-3 py-1 rounded">
                          {customFieldSelectionRef.current?.getObject()?.label || rule.customFieldName}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-700">are completed</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Select Action UI */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Select Action</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {["Move", "Add/Remove", "Dates", "Checklists", "Members", "Content", "Fields", "Sort", "Cascade"].map((action) => (
                        <div 
                          key={action}
                          className={`p-2 rounded text-center cursor-pointer ${
                            rule.action === action ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                          }`}
                          onClick={() => setRule(prev => ({ ...prev, action }))}
                        >
                          {action}
                        </div>
                      ))}
                    </div>
                    
                    {/* Move Action UI */}
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="bg-white rounded px-3 py-1 mr-2">move</div>
                        <div className="mr-2">the card to</div>
                        <div className="bg-white rounded px-3 py-1 mr-2">the top of list</div>
                      </div>
                      
                      <div className="mt-3 flex items-center">
                        <ListSelection ref={listFieldSelectionRef} size='small' width={"fit-content"} />
                        <Button 
                          icon={<UnorderedListOutlined />} 
                          className="ml-2" 
                        />
                        <Button 
                          type="primary" 
                          shape="circle" 
                          icon={<PlusOutlined />} 
                          className="ml-4 bg-blue-600 hover:bg-blue-700" 
                          onClick={handleAddActionField}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="bg-white rounded px-3 py-1 mr-2">archive</div>
                        <div className="mr-2">the card</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button onClick={handlePrevStep}>
                      Back
                    </Button>
                    <Button 
                      type="primary" 
                      onClick={handleNextStep}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review and Save */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Review and Save</h2>
              
              {/* Trigger Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Trigger</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700">when custom fields</span>
                    </div>
                    <Button type="text" icon={<CloseOutlined />} />
                  </div>
                  <div className="mt-2">
                    <div className="bg-white px-3 py-1 rounded inline-block">
                      {rule.customFieldName || customFieldSelectionRef.current?.getObject()?.label || "Select custom field"}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-700">are completed</span>
                  </div>
                </div>
              </div>
              
              {/* Action Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Action</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-700">move the card to the top of list</span>
                    </div>
                    <Button type="text" icon={<CloseOutlined />} />
                  </div>
                  <div className="mt-2">
                    <div className="bg-white px-3 py-1 rounded inline-block">
                      {listFieldSelectionRef.current?.getObject()?.label || "No list selected"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  type="link"
                  className="items-center"
                  icon={<PlusOutlined />}
                >
                  Add another action
                </Button>
              </div>
              
              <div className="flex justify-between mt-8">
                <Button onClick={handlePrevStep}>
                  Back
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Rule
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RuleContent;