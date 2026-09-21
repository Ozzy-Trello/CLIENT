"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  InputNumber,
  Row,
  Select,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createShippingQuote,
  getShippingOrigins,
  getShippingProducts,
  searchShippingDestinations,
  ShippingDestination,
  ShippingQuote,
} from "@api/shipping";
import {
  formatGrams,
  formatRupiah,
  roundShippingKg,
} from "@utils/shipping-weight";

const { Title, Text, Paragraph } = Typography;

const ESTIMATE_NOTE =
  "Hanya estimasi awal. Berat aktual bisa lebih ringan atau lebih berat. Kemasan belum termasuk; tarif akhir mengikuti hasil timbang, dimensi, dan ketentuan ekspedisi.";

export default function CekOngkirPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const { workspaceId } = params;

  const [originId, setOriginId] = useState<string | undefined>();
  const [destination, setDestination] = useState<ShippingDestination | null>(
    null
  );
  const [destinationQuery, setDestinationQuery] = useState("");
  const [productId, setProductId] = useState<string | undefined>();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const { data: origins = [], isLoading: loadingOrigins } = useQuery({
    queryKey: ["shippingOrigins", workspaceId],
    queryFn: () => getShippingOrigins(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["shippingProducts", workspaceId],
    queryFn: () => getShippingProducts(workspaceId),
    enabled: !!workspaceId,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [destinationSearch, setDestinationSearch] = useState("");
  const { data: destinations = [], isFetching: searchingDestination } =
    useQuery({
      queryKey: ["shippingDestinations", workspaceId, destinationSearch],
      queryFn: () => searchShippingDestinations(workspaceId, destinationSearch),
      enabled: !!workspaceId && destinationSearch.trim().length >= 3,
    });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDestinationSearch(destinationQuery),
      400
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [destinationQuery]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.mainCategoryId === productId),
    [products, productId]
  );

  const lines = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.variants
      .map((variant) => ({
        variant,
        quantity: quantities[variant.junctionId] ?? 0,
      }))
      .filter((line) => line.quantity > 0);
  }, [selectedProduct, quantities]);

  const totalPieces = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalGrams = lines.reduce(
    (sum, line) => sum + line.quantity * line.variant.shippingWeightGrams,
    0
  );
  const billedWeightKg = roundShippingKg(totalGrams);
  const canQuote = !!originId && !!destination && totalPieces > 0;

  const markDirty = () => {
    if (!quote) return;
    setIsDirty(true);
    setSelectedRates(new Set());
  };

  const quoteMutation = useMutation({
    mutationFn: () =>
      createShippingQuote(workspaceId, {
        originId: originId!,
        destinationId: destination!.id,
        destinationLabel: destination!.label,
        items: lines.map((line) => ({
          junctionId: line.variant.junctionId,
          quantity: line.quantity,
        })),
      }),
    onSuccess: (result) => {
      setQuote(result);
      setIsDirty(false);
      setSelectedRates(new Set());
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Gagal menghitung ongkir"
      );
    },
  });

  const visibleRates = quote?.rates ?? [];
  const rateKey = (index: number) => String(index);
  const chosenRates = visibleRates.filter((_, index) =>
    selectedRates.has(rateKey(index))
  );

  const autotext = useMemo(() => {
    if (!quote || isDirty || chosenRates.length === 0) return "";
    const itemLines = quote.items
      .map((item) => `${item.variantName}: ${item.quantity} pcs`)
      .join("\n");
    const rateLines = chosenRates
      .map(
        (rate, index) =>
          `${index + 1}. ${rate.courierName} ${rate.service} — ${formatRupiah(rate.cost)}` +
          (rate.etd ? `\n   Estimasi ${rate.etd}` : "")
      )
      .join("\n");

    return [
      `Halo Kak, berikut estimasi ongkir pesanan Kakak dari ${quote.origin.name} ke ${quote.destination.label}.`,
      `Dari: ${quote.origin.name}\nAlamat asal: ${quote.origin.address}\nKe: ${quote.destination.label}\nProduk: ${quote.items[0]?.productName ?? "-"}\n${itemLines}\nTotal: ${quote.totalPieces} pcs\nEstimasi berat produk: ${formatGrams(quote.totalGrams)}\nBerat hitung ongkir: ${quote.billedWeightKg} kg`,
      rateLines,
      "Estimasi waktu dihitung setelah paket diserahkan ke ekspedisi, di luar waktu produksi.",
      ESTIMATE_NOTE,
      "Kakak mau pilih pengiriman yang mana?",
    ].join("\n\n");
  }, [quote, isDirty, chosenRates]);

  const copyAutotext = async () => {
    try {
      await navigator.clipboard.writeText(autotext);
      message.success("Pesan disalin. Tempel ke chat konsumen.");
    } catch {
      message.error("Gagal menyalin. Pilih teksnya lalu salin manual.");
    }
  };

  if (loadingOrigins || loadingProducts) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title level={3}>Cek Ongkir</Title>
      <Paragraph type="secondary">
        Pilih cabang asal, tujuan, dan jumlah pcs. Hasilnya bisa langsung
        disalin ke chat konsumen.
      </Paragraph>

      {origins.length === 0 && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Belum ada cabang pengiriman yang aktif"
          description="Buka Materials → tab Cabang Kirim untuk mengisi alamat dan titik RajaOngkir, lalu aktifkan cabangnya."
        />
      )}

      {products.length === 0 && (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="Belum ada produk dengan berat"
          description="Buka Materials → tab Materials → Edit produk, isi berat per varian, lalu centang Tampilkan di ongkir."
        />
      )}

      <Card className="mb-4">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text strong>Dikirim dari cabang</Text>
            <Select
              className="mt-2 w-full"
              placeholder="Pilih cabang"
              value={originId}
              onChange={(value) => {
                setOriginId(value);
                markDirty();
              }}
              options={origins.map((origin) => ({
                label: origin.name,
                value: origin.id,
              }))}
            />
            {originId && (
              <Text type="secondary" className="mt-1 block text-xs">
                {origins.find((o) => o.id === originId)?.address}
              </Text>
            )}
          </Col>

          <Col xs={24} md={10}>
            <Text strong>Tujuan pengiriman</Text>
            <Select
              showSearch
              className="mt-2 w-full"
              placeholder="Ketik kecamatan atau kelurahan"
              filterOption={false}
              notFoundContent={
                searchingDestination ? (
                  <Spin size="small" />
                ) : destinationQuery.trim().length < 3 ? (
                  "Ketik minimal 3 huruf"
                ) : (
                  "Tujuan tidak ditemukan"
                )
              }
              value={destination?.id}
              onSearch={setDestinationQuery}
              onChange={(value) => {
                const found = destinations.find((item) => item.id === value);
                setDestination(found ?? null);
                markDirty();
              }}
              options={destinations.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
            />
          </Col>

          <Col xs={24} md={6}>
            <Text strong>Produk</Text>
            <Select
              className="mt-2 w-full"
              placeholder="Pilih produk"
              value={productId}
              onChange={(value) => {
                setProductId(value);
                setQuantities({});
                markDirty();
              }}
              options={products.map((product) => ({
                label: product.name,
                value: product.mainCategoryId,
              }))}
            />
          </Col>
        </Row>

        {selectedProduct && (
          <>
            <Row gutter={[16, 16]} className="mt-4">
              {selectedProduct.variants.map((variant) => (
                <Col xs={12} md={6} key={variant.junctionId}>
                  <Text className="text-xs">
                    {variant.name} · {variant.shippingWeightGrams} g/pcs
                  </Text>
                  <InputNumber
                    className="mt-1 w-full"
                    min={0}
                    max={100000}
                    precision={0}
                    value={quantities[variant.junctionId] ?? 0}
                    onChange={(value) => {
                      setQuantities((prev) => ({
                        ...prev,
                        [variant.junctionId]: value ?? 0,
                      }));
                      markDirty();
                    }}
                  />
                </Col>
              ))}
            </Row>

            <Row gutter={16} className="mt-4 rounded bg-gray-50 p-4">
              <Col xs={8}>
                <Statistic title="Total jumlah" value={totalPieces} suffix="pcs" />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Estimasi berat produk"
                  value={totalGrams}
                  suffix="g"
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Berat hitung ongkir"
                  value={billedWeightKg}
                  suffix="kg"
                />
              </Col>
            </Row>

            <Text type="secondary" className="mt-2 block text-xs">
              Sisa 300 gram atau lebih dibulatkan naik, di bawah itu dibulatkan
              turun. Minimum 1 kg. Contoh: 1.299 g jadi 1 kg, 1.300 g jadi 2 kg.
            </Text>
          </>
        )}

        <Alert className="mt-4" type="warning" showIcon message={ESTIMATE_NOTE} />

        <Button
          type="primary"
          className="mt-4"
          disabled={!canQuote}
          loading={quoteMutation.isPending}
          onClick={() => quoteMutation.mutate()}
        >
          Cek Ongkir
        </Button>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="Pilihan pengiriman">
            {!quote && <Empty description="Belum ada hasil. Klik Cek Ongkir." />}

            {quote && isDirty && (
              <Alert
                type="warning"
                showIcon
                message="Data berubah. Cek ulang ongkir sebelum membagikan."
              />
            )}

            {quote && !isDirty && (
              <>
                <Text type="secondary" className="mb-3 block text-xs">
                  {quote.origin.name} → {quote.destination.label} ·{" "}
                  {quote.totalPieces} pcs · {formatGrams(quote.totalGrams)} →{" "}
                  {quote.billedWeightKg} kg
                </Text>

                <Checkbox
                  className="mb-3"
                  checked={
                    visibleRates.length > 0 &&
                    chosenRates.length === visibleRates.length
                  }
                  indeterminate={
                    chosenRates.length > 0 &&
                    chosenRates.length < visibleRates.length
                  }
                  onChange={(e) =>
                    setSelectedRates(
                      e.target.checked
                        ? new Set(visibleRates.map((_, index) => rateKey(index)))
                        : new Set()
                    )
                  }
                >
                  Centang semua ekspedisi
                </Checkbox>

                {visibleRates.length === 0 && (
                  <Empty description="Tidak ada tarif untuk rute dan berat ini." />
                )}

                <div className="max-h-96 overflow-y-auto">
                  {visibleRates.map((rate, index) => (
                    <label
                      key={`${rate.courierCode}-${rate.service}-${index}`}
                      className="flex items-center justify-between gap-3 border-b py-2"
                    >
                      <Checkbox
                        checked={selectedRates.has(rateKey(index))}
                        onChange={(e) => {
                          setSelectedRates((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(rateKey(index));
                            else next.delete(rateKey(index));
                            return next;
                          });
                        }}
                      >
                        <span className="font-medium">
                          {rate.courierName} · {rate.service}
                        </span>
                        {rate.etd && (
                          <Tag className="ml-2">Estimasi {rate.etd}</Tag>
                        )}
                      </Checkbox>
                      <span className="font-semibold text-green-700">
                        {formatRupiah(rate.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Bagikan ke konsumen">
            {autotext ? (
              <>
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">
                  {autotext}
                </pre>
                <Button type="primary" className="mt-3" onClick={copyAutotext}>
                  Salin pesan
                </Button>
              </>
            ) : (
              <Empty description="Pilih minimal satu layanan untuk membuat pesan." />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
