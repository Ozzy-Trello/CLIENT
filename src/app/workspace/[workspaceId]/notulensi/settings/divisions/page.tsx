"use client";

import {
  useCreateNotulensiDivision,
  useDeleteNotulensiDivision,
  useNotulensiDivisions,
  useUpdateNotulensiDivision,
} from "@hooks/notulensi";
import { useCurrentAccount } from "@hooks/account";
import { useAllRoles } from "@hooks/board";
import { NotulensiDivision } from "@myTypes/notulensi";
import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography, message } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const { Text, Title } = Typography;

export default function NotulensiDivisionsPage() {
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId || "";
  const { data: accountData, isLoading: accountLoading } = useCurrentAccount();
  const { data: rolesResponse, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useAllRoles(workspaceId);
  const divisionsQuery = useNotulensiDivisions(workspaceId);
  const createDivision = useCreateNotulensiDivision();
  const updateDivision = useUpdateNotulensiDivision();
  const deleteDivision = useDeleteNotulensiDivision();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState<NotulensiDivision | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isSuperAdmin = accountData?.data?.role?.name === "Super Admin";
  const roles = rolesResponse?.data ?? [];
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles]
  );

  useEffect(() => {
    if (!modalOpen) return;
    form.setFieldsValue({
      name: editing?.name ?? "",
      roleIds: editing?.roles.map((role) => role.id) ?? [],
    });
  }, [editing, form, modalOpen]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { name: values.name.trim(), roleIds: values.roleIds as string[] };
      if (editing) {
        await updateDivision.mutateAsync({ workspaceId, divisionId: editing.id, payload });
        message.success("Divisi diperbarui");
      } else {
        await createDivision.mutateAsync({ workspaceId, payload });
        message.success("Divisi ditambahkan");
      }
      closeModal();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) return;
      const apiMessage = (error as any)?.response?.data?.message;
      message.error(apiMessage || "Gagal menyimpan divisi");
    }
  };

  const handleDelete = async (divisionId: string) => {
    try {
      await deleteDivision.mutateAsync({ workspaceId, divisionId });
      message.success("Divisi dihapus");
    } catch (error) {
      const apiMessage = (error as any)?.response?.data?.message;
      message.error(apiMessage || "Gagal menghapus divisi");
    }
  };

  const columns = [
    {
      title: "Divisi",
      key: "division",
      render: (_: unknown, division: NotulensiDivision) => (
        <div className="min-w-0">
          <Text strong>{division.name}</Text>
          <div className="mt-1 text-xs text-gray-500 sm:hidden">
            {division.roles.map((role) => role.name).join(", ") || "Belum ada jabatan"}
          </div>
        </div>
      ),
    },
    {
      title: "Jabatan",
      key: "roles",
      responsive: ["sm" as const],
      render: (_: unknown, division: NotulensiDivision) =>
        division.roles.map((role) => role.name).join(", ") || "Belum ada jabatan",
    },
    {
      title: "Aksi",
      key: "actions",
      width: 150,
      render: (_: unknown, division: NotulensiDivision) => (
        <Space size="small" wrap>
          <Button
            size="small"
            onClick={() => {
              setEditing(division);
              setModalOpen(true);
            }}
          >
            Ubah
          </Button>
          <Popconfirm
            title={`Hapus divisi ${division.name}?`}
            description="Filter yang tersimpan untuk divisi ini akan dihapus."
            okText="Hapus"
            cancelText="Batal"
            onConfirm={() => handleDelete(division.id)}
          >
            <Button size="small" danger loading={deleteDivision.isPending}>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (accountLoading) {
    return <div className="p-4 text-sm text-gray-500">Memuat akses...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Alert type="error" showIcon message="Hanya Super Admin yang dapat mengelola Master Divisi." />
        <Link href={`/workspace/${workspaceId}/notulensi`}>
          <Button>Kembali ke Notulensi</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text type="secondary" className="block uppercase tracking-wide">
            Tasks and Projects
          </Text>
          <Title level={2} className="!mb-1 !mt-0">Master Divisi</Title>
          <Text type="secondary">Hubungkan divisi dengan satu atau beberapa jabatan.</Text>
        </div>
        <Space wrap>
          <Link href={`/workspace/${workspaceId}/notulensi`}>
            <Button>Kembali</Button>
          </Link>
          <Button type="primary" onClick={openCreate}>Tambah Divisi</Button>
        </Space>
      </div>

      {(divisionsQuery.isError || rolesError) && (
        <Alert
          type="error"
          showIcon
          message="Gagal memuat data Master Divisi"
          action={(
            <Space>
              <Button size="small" onClick={() => divisionsQuery.refetch()}>Coba lagi</Button>
              <Button size="small" onClick={() => refetchRoles()}>Muat ulang jabatan</Button>
            </Space>
          )}
        />
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={divisionsQuery.data?.data ?? []}
        loading={divisionsQuery.isLoading || rolesLoading}
        pagination={false}
        locale={{
          emptyText: "Belum ada divisi. Tambahkan divisi untuk menggunakannya sebagai filter.",
        }}
        scroll={{ x: 520 }}
      />

      <Modal
        open={modalOpen}
        title={editing ? "Ubah Divisi" : "Tambah Divisi"}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={createDivision.isPending || updateDivision.isPending}
        okText={editing ? "Simpan" : "Tambah"}
        cancelText="Batal"
        width="min(640px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Nama Divisi"
            name="name"
            rules={[
              { required: true, whitespace: true, message: "Nama divisi wajib diisi" },
              { max: 100, message: "Nama divisi maksimal 100 karakter" },
            ]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label="Jabatan"
            name="roleIds"
            rules={[{ required: true, type: "array", min: 1, message: "Pilih minimal satu jabatan" }]}
          >
            <Select
              mode="multiple"
              options={roleOptions}
              loading={rolesLoading}
              placeholder="Pilih jabatan"
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
