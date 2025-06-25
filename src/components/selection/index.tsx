import {
  AutoComplete,
  Avatar,
  Input,
  Select,
  SelectProps,
  Typography,
} from "antd";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

import { useWorkspaces } from "@hooks/workspace";
import { useDispatch } from "react-redux";
import {
  selectCurrentWorkspace,
  setCurrentWorkspace,
} from "@store/workspace_slice";
import { useParams, useRouter } from "next/navigation";
import { accountList } from "@api/account";
import { useSelector } from "react-redux";
import { useLists } from "@hooks/list";
import { useCustomFields } from "@hooks/custom_field";
import { useAccountList } from "@hooks/account";
import { Card } from "@myTypes/card";
import { cards } from "@api/card";

// Global SELECTION props

interface FieldValueInputProps extends SelectionProps {
  field: {
    type: string;
    source: string;
    option?: Array<{ label: string; value: string }>;
  };
  value?: string;
  onChange?: (value: string, option?: any) => void;
  placeholder?: string;
}
export interface SelectionRef {
  getValue: () => string | undefined;
  getObject: () =>
    | { label: string | JSX.Element | undefined; value: string }
    | undefined;
  setValue: (value: string) => void;
}

interface SelectionProps {
  placeholder?: string;
  width?: string | number;
  size?: "large" | "middle" | "small";
  style?: React.CSSProperties;
  className?: string;
  value?: string;
  onChange?: (value: string, option?: any) => void;
  [key: string]: any; // Allow additional props
}

export const UserSelection = forwardRef<SelectionRef, SelectionProps>(
  (
    {
      placeholder = "Select a User",
      width = "100%",
      size = "middle",
      style = {},
      className = "",
      value,
      onChange,
    },
    ref
  ) => {
    const { workspaceId, boardId } = useParams();
    const [options, setOptions] = useState<
      { label: JSX.Element | string | undefined; value: string }[]
    >([]);
    const [selectedValue, setSelectedValue] = useState<string | undefined>(
      value
    );
    const [selectedObject, setSelectedObject] = useState<{
      label: JSX.Element | string | undefined;
      value: string;
    }>();

    // If the value prop changes, update our internal state
    useEffect(() => {
      if (value !== undefined && value !== selectedValue) {
        setSelectedValue(value);
      }
    }, [value]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getValue: () => selectedValue,
      getObject: () => selectedObject,
      setValue: (value: string) => {
        setSelectedValue(value);
        const foundOption = options.find((opt) => opt.value === value);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      },
    }));

    // Handle selection change
    const handleChange = (value: string, option: any) => {
      setSelectedValue(value);

      // Store the entire selected object
      if (Array.isArray(option)) {
        // Handle case if Select allows multiple selection
        const selectedOptions = option.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        setSelectedObject(selectedOptions[0]);
      } else {
        setSelectedObject({ label: option.label, value: option.value });
      }

      // Call the onChange prop if provided
      if (onChange) {
        onChange(value, option);
      }
    };

    // Fetch user data
    useEffect(() => {
      const fetchData = async () => {
        const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
        const bId = Array.isArray(boardId) ? boardId[0] : boardId;
        const result = await accountList(wsId, bId);

        if (result && result.data) {
          const opt = result.data.map((item) => ({
            value: item.id,
            label: (
              <div className="flex justify-start items-center gap-3">
                <Avatar
                  size={20}
                  className="bg-blue-50 text-blue-500 border border-blue-100"
                >
                  {item.username?.substring(0, 2)?.toUpperCase()}
                </Avatar>
                <Typography.Text>{item.username}</Typography.Text>
              </div>
            ),
          }));
          setOptions(opt);
        }
      };

      fetchData();
    }, [workspaceId, boardId]);

    // When options change, update the selected object if value is already set
    useEffect(() => {
      if (selectedValue && options.length > 0) {
        const foundOption = options.find((opt) => opt.value === selectedValue);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      }
    }, [options, selectedValue]);

    return (
      <Select
        style={{ width, ...style }}
        showSearch
        placeholder={placeholder}
        optionFilterProp="label"
        onChange={handleChange}
        value={selectedValue}
        options={options}
        size={size}
        className={className}
        notFoundContent={
          options.length === 0 ? "No user available" : "No match found"
        }
      />
    );
  }
);

export const WorkspaceSelection: React.FC = () => {
  const [options, setOptions] = useState<
    { label: string | JSX.Element; value: string }[]
  >([]);
  const { workspaces } = useWorkspaces();
  const dispatch = useDispatch();
  const router = useRouter();
  const currentWorkspace = useSelector(selectCurrentWorkspace);

  const handleChange = (value: string | undefined) => {
    if (!value) {
      router.push(`/workspace`);
    } else {
      const w = workspaces.find((item) => item.id === value);
      if (currentWorkspace?.id !== w?.id) {
        dispatch(setCurrentWorkspace(w));
      }
      router.push(`/workspace/${value}`);
    }
  };

  useEffect(() => {
    if (workspaces) {
      const opt = workspaces?.map((item) => ({
        label: item.name,
        value: item.id,
      }));
      setOptions(opt);
      if (!currentWorkspace) {
        dispatch(setCurrentWorkspace(workspaces[0]));
        router.push(`/workspace/${workspaces[0]?.id}`);
      }
    }
  }, [workspaces]);

  return (
    <Select
      style={{ minWidth: "100px" }}
      showSearch
      placeholder="Select a workspace"
      value={currentWorkspace?.id}
      optionFilterProp="label"
      onChange={handleChange}
      options={options}
      notFoundContent={
        workspaces.length === 0 ? "No workspaces available" : "No match found"
      }
    />
  );
};

export const VisibilitySelection: React.FC = () => {
  const [options, setOption] = useState([
    { id: "private", label: "Private" },
    { id: "shared", label: "Shared" },
    { id: "public", label: "Public" },
  ]);

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  return (
    <Select
      defaultValue="workspace-default"
      style={{ width: 200 }}
      onChange={handleChange}
      options={options}
    />
  );
};

export const ListSelection = forwardRef<SelectionRef, SelectionProps>(
  (
    {
      placeholder = "Select a List",
      width = "100%",
      size = "middle",
      style = {},
      className = "",
      value,
      onChange,
    },
    ref
  ) => {
    const [options, setOptions] = useState<{ label: string; value: string }[]>(
      []
    );
    const [selectedValue, setSelectedValue] = useState<string | undefined>(
      value
    );
    const [selectedObject, setSelectedObject] = useState<{
      label: string;
      value: string;
    }>();
    const { boardId } = useParams();
    const { lists } = useLists(Array.isArray(boardId) ? boardId[0] : boardId);

    useImperativeHandle(ref, () => ({
      getValue: () => selectedValue,
      getObject: () => selectedObject,
      setValue: (value: string) => {
        setSelectedValue(value);
        const foundOption = options.find((opt) => opt.value === value);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      },
    }));

    const handleChange = (value: string, option: any) => {
      setSelectedValue(value);
      // Store the entire selected object
      if (Array.isArray(option)) {
        // Handle case if Select allows multiple selection
        const selectedOptions = option.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        setSelectedObject(selectedOptions[0]);
      } else {
        setSelectedObject({ label: option.label, value: option.value });
      }

      if (onChange) {
        onChange(value, option);
      }
    };

    useEffect(() => {
      if (lists) {
        const opt = lists?.map((item) => ({
          label: item.name ?? "",
          value: item.id,
        }));
        setOptions(opt);
      }
    }, [lists]);

    // When options change, update the selected object if value is already set
    useEffect(() => {
      if (selectedValue && options.length > 0) {
        const foundOption = options.find((opt) => opt.value === selectedValue);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      }
    }, [options, selectedValue]);

    return (
      <Select
        style={{ width, ...style }}
        showSearch
        placeholder={placeholder}
        optionFilterProp="label"
        onChange={handleChange}
        value={selectedValue}
        options={options}
        size={size}
        className={className}
        notFoundContent={
          lists?.length === 0 ? "No list available" : "No match found"
        }
      />
    );
  }
);

export const CustomFieldSelection = forwardRef<
  SelectionRef,
  SelectionProps & { filterTypes?: string | string[] }
>(
  (
    {
      placeholder = "Select a Field",
      width = "100%",
      size = "middle",
      style = {},
      className = "",
      onChange,
      multi = false,
      filterTypes,
    },
    ref
  ) => {
    const [options, setOptions] = useState<{ label: string; value: string }[]>(
      []
    );
    const [selectedValue, setSelectedValue] = useState<string>();
    const [selectedObject, setSelectedObject] = useState<{
      label: string;
      value: string;
    }>();
    const { workspaceId, boardId } = useParams();
    const { customFields } = useCustomFields(
      Array.isArray(workspaceId) ? workspaceId[0] : workspaceId
    );

    useImperativeHandle(ref, () => ({
      getValue: () => selectedValue,
      getObject: () => selectedObject,
      setValue: (value: string) => {
        setSelectedValue(value);
        const foundOption = options.find((opt) => opt.value === value);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      },
    }));

    const handleChange = (value: string, option: any) => {
      setSelectedValue(value);
      // Store the entire selected object
      if (Array.isArray(option)) {
        // Handle case if Select allows multiple selection
        const selectedOptions = option.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        setSelectedObject(selectedOptions[0]);
      } else {
        setSelectedObject({ label: option.label, value: option.value });
      }

      if (onChange) {
        onChange(value, option);
      }
    };

    useEffect(() => {
      if (customFields) {
        const filteredFields = filterTypes
          ? customFields.filter((item: any) =>
              Array.isArray(filterTypes)
                ? filterTypes.includes(item.type)
                : item.type === filterTypes
            )
          : customFields;

        const opt = filteredFields.map((item: any) => ({
          label: item.name ?? "",
          value: item.id,
          option: item.options,
          source: item.source,
          type: item.type,
        }));
        setOptions(opt);
      }
    }, [customFields, filterTypes]);

    // When options change, update the selected object if value is already set
    useEffect(() => {
      if (selectedValue && options.length > 0) {
        const foundOption = options.find((opt) => opt.value === selectedValue);
        console.log("foundOption", options);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      }
    }, [options, selectedValue]);

    return (
      <Select
        style={{ width, ...style }}
        showSearch
        placeholder={placeholder}
        optionFilterProp="label"
        popupMatchSelectWidth={false}
        dropdownStyle={{ maxHeight: 300, overflowY: "auto" }}
        onChange={handleChange}
        optionRender={(option: any) => {
          const fieldType = option?.data?.type ?? option?.type;
          return (
            <div className="px-4 py-2  cursor-pointer w-100">
              <div className="flex flex-col w-full">
                <span className="text-white font-semibold text-sm leading-tight">
                  {option.label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    marginLeft: "10px",
                    color: "gray",
                  }}
                >
                  {fieldType}
                </span>
              </div>
            </div>
          );
        }}
        value={selectedValue}
        options={options}
        size={size}
        className={className}
        notFoundContent={
          customFields?.length === 0 ? "No field available" : "No match found"
        }
        mode={multi ? "multiple" : undefined}
      />
    );
  }
);

export const FieldValueInput = forwardRef<SelectionRef, FieldValueInputProps>(
  (
    {
      field,
      value,
      onChange,
      placeholder = "Enter value",
      width = "100%",
      size = "middle",
      style = {},
      className = "",
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value || "");
    const [selectedObject, setSelectedObject] = useState<{
      label: string;
      value: string;
    }>();
    const { workspaceId, boardId } = useParams();
    const [userOptions, setUserOptions] = useState<
      Array<{ label: string; value: string }>
    >([]);
    const usersQuery = useAccountList({
      workspaceId: workspaceId as string,
      boardId: boardId as string,
    });

    // Only fetch users when needed
    useEffect(() => {
      if (field?.source !== "user" || !workspaceId || !boardId) return;
      usersQuery.refetch();
    }, [field?.source, workspaceId, boardId]);

    useEffect(() => {
      if (field?.source === "user" && usersQuery.data?.data) {
        setUserOptions(
          usersQuery.data.data.map(
            (item: { username: string; id: string; name?: string }) => ({
              label: item.username || "Unnamed User",
              value: item.id,
            })
          )
        );
      }
    }, [usersQuery.data, field?.source]);

    useImperativeHandle(ref, () => ({
      getValue: () => inputValue,
      getObject: () => selectedObject,
      setValue: (val: string) => {
        setInputValue(val);
        const foundOption = field?.option?.find(
          (opt: { value: string }) => opt.value === val
        );
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      },
    }));

    useEffect(() => {
      setInputValue(value || "");
    }, [value]);

    const handleChange = (val: string, option: any) => {
      setInputValue(val);
      setSelectedObject(option);
      onChange?.(val, option);
    };

    if (field?.source === "user") {
      return (
        <Select
          style={{ width: "10%" }}
          className={className}
          value={inputValue}
          onChange={(val, option) => handleChange(val, option)}
          placeholder={placeholder}
          options={userOptions}
        />
      );
    }

    if (
      field?.type === "dropdown" &&
      field?.source === "custom" &&
      field?.option?.length
    ) {
      return (
        <Select
          style={{ width, ...style }}
          size={size}
          className={className}
          value={inputValue}
          onChange={(val, option) => handleChange(val, option)}
          placeholder={placeholder}
          options={field?.option}
        />
      );
    }

    return (
      <Input
        style={{ width, ...style }}
        size={size}
        className={className}
        value={inputValue}
        onChange={(e) =>
          handleChange(e.target.value, {
            value: e.target.value,
            label: e.target.value,
          })
        }
        placeholder={placeholder}
      />
    );
  }
);

export const CardPositionSelection = forwardRef<SelectionRef, SelectionProps>(
  (
    {
      listId,
      placeholder = "Select position in List",
      width = "100%",
      size = "middle",
      style = {},
      className = "",
      value,
      onChange,
    },
    ref
  ) => {
    const [options, setOptions] = useState<{ label: string; value: string }[]>(
      []
    );
    const [selectedValue, setSelectedValue] = useState<string | undefined>(
      value
    );
    const [selectedObject, setSelectedObject] = useState<{
      label: string;
      value: string;
    }>();
    const { boardId } = useParams();
    const [cardsInList, setCardsInList] = useState<Card[]>([]);
    const [isFetchingData, setIsFetchingData] = useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      getValue: () => selectedValue,
      getObject: () => selectedObject,
      setValue: (value: string) => {
        setSelectedValue(value);
        const foundOption = options.find((opt) => opt.value === value);
        if (foundOption) {
          setSelectedObject(foundOption);
        }
      },
    }));

    const handleChange = (value: string, option: any) => {
      setSelectedValue(value);
      // Store the entire selected object
      if (Array.isArray(option)) {
        // Handle case if Select allows multiple selection
        const selectedOptions = option.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        setSelectedObject(selectedOptions[0]);
      } else {
        setSelectedObject({ label: option.label, value: option.value });
      }

      if (onChange) {
        onChange(value, option);
      }
    };

    const fetchData = async () => {
      setCardsInList([]);
      setIsFetchingData(true);
      setOptions([]); // Clear options first

      const data = await cards(listId, boardId as string);
      if (data && data.data) {
        if (data?.data?.length > 0) {
          setCardsInList(data?.data);
          const opt = data?.data?.map((item, index) => {
            return {
              label: (index + 1).toString(),
              value: (index + 1).toString(),
            };
          });

          // Work with the local opt array instead of the options state
          const copyOpt = [...opt];
          let nextPos = parseInt(copyOpt[copyOpt.length - 1].value) + 1;
          copyOpt.push({
            label: nextPos.toString(),
            value: nextPos.toString(),
          });
          setOptions(copyOpt);
        } else {
          // If no cards, just set position 1
          setOptions([{ label: "1", value: "1" }]);
        }
      } else {
        // If no data, just set position 1
        setOptions([{ label: "1", value: "1" }]);
      }
      setIsFetchingData(false);
    };

    useEffect(() => {
      if (listId) {
        setSelectedValue(undefined);
        fetchData();
      }
    }, [listId]);

    // When options change, update the selected object if value is already set
    useEffect(() => {
      const foundOption = options.find((opt) => opt.value === selectedValue);
      if (foundOption) {
        setSelectedObject(foundOption);
      }
    }, [options, selectedValue]);

    return (
      <Select
        style={{ width, ...style }}
        showSearch
        placeholder={placeholder}
        optionFilterProp="label"
        onChange={handleChange}
        value={selectedValue}
        options={options}
        size={size}
        className={className}
        notFoundContent="No cards available in the list"
        loading={isFetchingData}
        disabled={isFetchingData}
      />
    );
  }
);
