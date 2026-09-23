"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getShippingCourierServices,
  getShippingCouriersAdmin,
  getShippingOriginsAdmin,
  searchShippingDestinations,
  ShippingCourierAdmin,
  ShippingCourierServiceAdmin,
  ShippingOriginAdmin,
  updateShippingCourier,
  updateShippingCourierService,
  updateShippingOrigin,
} from "@api/shipping";

const { Title, Text, Paragraph } = Typography;

export function ShippingOriginsTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ShippingOriginAdmin | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: origins = [], isLoading } = useQuery({
    queryKey: ["shippingOriginsAdmin", workspaceId],
    queryFn: () => getShippingOriginsAdmin(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: destinations = [], isFetching: searching } = useQuery({
    queryKey: ["shippingDestinations", workspaceId, search],
    queryFn: () => searchShippingDestinations(workspaceId, search),
    enabled: !!workspaceId && search.trim().length >= 3,
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateShippingOrigin>[2]) =>
      updateShippingOrigin(workspaceId, editing!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shippingOriginsAdmin", workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["shippingOrigins"] });
      message.success("Cabang diperbarui");
      setEditing(null);
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error || "Gagal memperbarui cabang"
      );
    },
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateShippingOrigin(workspaceId, id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shippingOriginsAdmin", workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["shippingOrigins"] });
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error || "Gagal mengubah status cabang"
      );
    },
  });

  const openEdit = (origin: ShippingOriginAdmin) => {
    setEditing(origin);
    setName(origin.name);
    setAddress(origin.address ?? "");
    setDestinationId(origin.rajaongkirDestinationId);
    setDestinationLabel(origin.rajaongkirLabel);
    setQuery("");
    setSearch("");
  };

  const destinationOptions = useMemo(() => {
    const options = destinations.map((item) => ({
      label: item.label,
      value: item.id,
    }));
    // Pertahankan titik yang sudah tersimpan supaya tidak hilang dari kotak
    // pilihan ketika admin belum mengetik apa pun.
    if (
      destinationId !== null &&
      destinationLabel &&
      !options.some((option) => option.value === destinationId)
    ) {
      options.unshift({ label: destinationLabel, value: destinationId });
    }
    return options;
  }, [destinations, destinationId, destinationLabel]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        Cabang Pengiriman
      </Title>
      <Paragraph type="secondary">
        Cabang baru muncul di halaman Cek Ongkir setelah alamat dan titik
        RajaOngkir diisi, lalu diaktifkan.
      </Paragraph>

      <Table
        rowKey="id"
        dataSource={origins}
        pagination={false}
        columns={[
          { title: "Kode", dataIndex: "branchCode", width: 90 },
          { title: "Nama", dataIndex: "name" },
          {
            title: "Alamat",
            dataIndex: "address",
            render: (value: string | null) =>
              value || <Text type="secondary">Belum diisi</Text>,
          },
          {
            title: "Titik RajaOngkir",
            dataIndex: "rajaongkirLabel",
            render: (value: string | null, record: ShippingOriginAdmin) =>
              record.rajaongkirDestinationId ? (
                <Tag color="blue">{value || record.rajaongkirDestinationId}</Tag>
              ) : (
                <Text type="secondary">Belum dipilih</Text>
              ),
          },
          {
            title: "Aktif",
            dataIndex: "isActive",
            width: 90,
            render: (value: boolean, record: ShippingOriginAdmin) => (
              <Switch
                checked={value}
                loading={activateMutation.isPending}
                disabled={
                  !value &&
                  (!record.address || !record.rajaongkirDestinationId)
                }
                onChange={(checked) =>
                  activateMutation.mutate({ id: record.id, isActive: checked })
                }
              />
            ),
          },
          {
            title: "Aksi",
            width: 90,
            render: (_: unknown, record: ShippingOriginAdmin) => (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                Ubah
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={`Ubah cabang ${editing?.branchCode ?? ""}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        okText="Simpan"
        confirmLoading={saveMutation.isPending}
        onOk={() =>
          saveMutation.mutate({
            name,
            address: address.trim() || null,
            rajaongkirDestinationId: destinationId,
            rajaongkirLabel: destinationLabel,
          })
        }
      >
        <div className="space-y-3">
          <div>
            <Text strong>Nama cabang</Text>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="OZZY Clothing Warungboto"
            />
          </div>

          <div>
            <Text strong>Alamat lengkap</Text>
            <Input.TextArea
              className="mt-1"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Ki Penjawi No. 3B, Pandeyan, Umbulharjo, Yogyakarta 55161"
            />
          </div>

          <div>
            <Text strong>Titik RajaOngkir</Text>
            <Select
              showSearch
              allowClear
              className="mt-1 w-full"
              placeholder="Ketik kecamatan atau kelurahan"
              filterOption={false}
              value={destinationId ?? undefined}
              notFoundContent={
                searching ? (
                  <Spin size="small" />
                ) : query.trim().length < 3 ? (
                  "Ketik minimal 3 huruf"
                ) : (
                  "Tidak ditemukan"
                )
              }
              onSearch={setQuery}
              onChange={(value) => {
                if (value === undefined) {
                  setDestinationId(null);
                  setDestinationLabel(null);
                  return;
                }
                setDestinationId(value);
                setDestinationLabel(
                  destinations.find((item) => item.id === value)?.label ?? null
                );
              }}
              options={destinationOptions}
            />
            <Text type="secondary" className="mt-1 block text-xs">
              Titik ini dipakai sebagai alamat asal saat menghitung ongkir.
            </Text>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export function ShippingCouriersTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  const { data: couriers = [], isLoading } = useQuery({
    queryKey: ["shippingCouriersAdmin", workspaceId],
    queryFn: () => getShippingCouriersAdmin(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["shippingCourierServices", workspaceId],
    queryFn: () => getShippingCourierServices(workspaceId),
    enabled: !!workspaceId,
  });

  const servicesByCourier = useMemo(() => {
    const map = new Map<string, ShippingCourierServiceAdmin[]>();
    for (const service of services) {
      const rows = map.get(service.courierCode) ?? [];
      rows.push(service);
      map.set(service.courierCode, rows);
    }
    return map;
  }, [services]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateShippingCourier(workspaceId, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shippingCouriersAdmin", workspaceId],
      });
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error || "Gagal mengubah status ekspedisi"
      );
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateShippingCourierService(workspaceId, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shippingCourierServices", workspaceId],
      });
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error || "Gagal mengubah status layanan"
      );
    },
  });

  if (isLoading || loadingServices) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <Card>
      <Title level={4} style={{ marginTop: 0 }}>
        Ekspedisi
      </Title>
      <Paragraph type="secondary">
        Ekspedisi yang dimatikan tidak muncul di hasil Cek Ongkir maupun di
        pesan yang dikirim ke konsumen. Buka barisnya untuk mematikan layanan
        tertentu saja, misalnya JNE JTR&gt;200 yang tidak dipakai untuk
        pakaian.
      </Paragraph>

      <Table
        rowKey="id"
        dataSource={couriers}
        pagination={false}
        expandable={{
          expandedRowRender: (record: ShippingCourierAdmin) => {
            const rows = servicesByCourier.get(record.courierCode) ?? [];
            if (rows.length === 0) {
              return (
                <Text type="secondary" className="text-xs">
                  Layanan akan muncul setelah pengecekan ongkir.
                </Text>
              );
            }
            return (
              <Table
                rowKey="id"
                size="small"
                dataSource={rows}
                pagination={false}
                columns={[
                  { title: "Layanan", dataIndex: "service" },
                  {
                    title: "Tampilkan",
                    dataIndex: "isActive",
                    width: 120,
                    render: (
                      value: boolean,
                      service: ShippingCourierServiceAdmin
                    ) => (
                      <Switch
                        size="small"
                        checked={value}
                        loading={toggleServiceMutation.isPending}
                        onChange={(checked) =>
                          toggleServiceMutation.mutate({
                            id: service.id,
                            isActive: checked,
                          })
                        }
                      />
                    ),
                  },
                ]}
              />
            );
          },
        }}
        columns={[
          { title: "Ekspedisi", dataIndex: "displayName" },
          {
            title: "Kode",
            dataIndex: "courierCode",
            width: 120,
            render: (value: string) => <Tag>{value}</Tag>,
          },
          {
            title: "Layanan",
            width: 140,
            render: (_: unknown, record: ShippingCourierAdmin) => {
              const rows = servicesByCourier.get(record.courierCode) ?? [];
              if (rows.length === 0) {
                return <Text type="secondary">Belum ada</Text>;
              }
              const active = rows.filter((row) => row.isActive).length;
              return (
                <Text type={active === rows.length ? undefined : "warning"}>
                  {active} dari {rows.length}
                </Text>
              );
            },
          },
          {
            title: "Tampilkan",
            dataIndex: "isActive",
            width: 120,
            render: (value: boolean, record: ShippingCourierAdmin) => (
              <Switch
                checked={value}
                loading={toggleMutation.isPending}
                onChange={(checked) =>
                  toggleMutation.mutate({ id: record.id, isActive: checked })
                }
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
