import { Form, Input, Select } from "antd";
import { useState } from "react";

const sortOptions = [
  {
   "value":"most-recently-active",
   "label": "Mostly recently active"
  },
  {
   "value":"least-recently-active",
   "label": "Least recently active"
  },
  {
   "value":"alphabetically-a-z",
   "label": "Alphabetically A-Z"
  },
  {
   "value":"alphabetically-z-a",
   "label": "Alphabetically Z-A"
  } 
 ];

type LayoutType = Parameters<typeof Form>[0]['layout'];
const FilterForm: React.FC = () => {

  const [form] = Form.useForm();
  const [formLayout, setFormLayout] = useState<LayoutType>('vertical');

  const onFormLayoutChange = ({ layout }: { layout: LayoutType }) => {
    setFormLayout(layout);
  };

  const handleChange = (value: string) => {
    console.log(`selected ${value}`);
  };

  return (
    <Form
        layout={formLayout}
        form={form}
        initialValues={{ layout: formLayout }}
        onValuesChange={onFormLayoutChange}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Form.Item label="Sort by">
            <Select
              defaultValue={sortOptions[0].label}
              style={{ width: 200 }}
              onChange={handleChange}
              options={sortOptions}
            />
          </Form.Item>
          <Form.Item label="Sort by">
            <Select
              defaultValue={""}
              style={{ width: 200 }}
              options={[]}
            />
          </Form.Item>
        </div>
        <Form.Item label="Search">
          <Input
            placeholder="Search…"
            prefix={<i className="fi fi-rr-search"></i>}
            style={{
              width: 200,
              borderRadius: 4,
            }}
          />
        </Form.Item>
      </Form>
  )
}

export default FilterForm;