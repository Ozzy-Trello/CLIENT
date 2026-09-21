"use client";
import { Button, Card, Divider, Typography, message } from "antd";
import { SendOutlined, DisconnectOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTelegramLinkStatus,
  startTelegramLink,
  unlinkTelegram,
} from "@api/telegram-link";

const TelegramLinkCard: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["telegramLinkStatus"],
    queryFn: getTelegramLinkStatus,
  });

  const link = useMutation({
    mutationFn: startTelegramLink,
    onSuccess: (data) => {
      // Telegram carries the code for the user, so nothing has to be typed.
      window.open(data.deepLink, "_blank", "noopener");
      message.info(
        "Tekan Start di Telegram, lalu kembali ke halaman ini dan muat ulang.",
      );
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || "Gagal membuat tautan Telegram",
      );
    },
  });

  const unlink = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegramLinkStatus"] });
      message.success("Telegram diputuskan");
    },
    onError: () => message.error("Gagal memutuskan Telegram"),
  });

  const linked = status?.linked === true;

  return (
    <Card className="security-card" bordered={false}>
      <div className="card-header">
        <div className="fx-h-left-center">
          <SendOutlined className="section-icon" />
          <Typography.Title level={4} className="m-0">
            Telegram
          </Typography.Title>
        </div>
        {linked ? (
          <Button
            type="default"
            icon={<DisconnectOutlined />}
            loading={unlink.isPending}
            onClick={() => unlink.mutate()}
            className="edit-button"
          >
            Putuskan
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={link.isPending}
            onClick={() => link.mutate()}
            className="edit-button"
          >
            Hubungkan Telegram
          </Button>
        )}
      </div>

      <Divider className="card-divider" />

      {isLoading ? (
        <Typography.Text type="secondary">Memuat...</Typography.Text>
      ) : linked ? (
        <Typography.Text>
          Terhubung
          {status?.telegramUsername ? ` sebagai @${status.telegramUsername}` : ""}
          . Notifikasi akan dikirim ke chat Telegram Anda.
        </Typography.Text>
      ) : (
        <Typography.Text type="secondary">
          Hubungkan Telegram untuk menerima notifikasi pribadi. Anda hanya perlu
          menekan Start satu kali di bot.
        </Typography.Text>
      )}
    </Card>
  );
};

export default TelegramLinkCard;
