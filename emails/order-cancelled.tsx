import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatPrice } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders/queries";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

/**
 * Order cancelled email. Includes refund information when the cancellation
 * involved a refund.
 */
export function OrderCancelledEmail({
  order,
  refunded,
}: {
  order: OrderDTO;
  refunded: boolean;
}) {
  return (
    <Html>
      <Head />
      <Preview>Order {order.orderNumber} has been cancelled</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Order cancelled</Heading>
          <Text style={text}>
            Your order {order.orderNumber} has been cancelled.
          </Text>

          {refunded ? (
            <Section style={card}>
              <Text style={text}>
                A refund of {formatPrice(order.totalCents)} has been issued to
                your original payment method. Please allow 5-10 business days
                for the refund to appear on your statement.
              </Text>
            </Section>
          ) : (
            <Text style={text}>
              Since payment had not been completed, no charge was made to your
              account.
            </Text>
          )}

          <Section style={{ textAlign: "center", marginTop: "16px" }}>
            <Button style={button} href={`${siteUrl}/products`}>
              Continue shopping
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={muted}>
            Questions? Reply to this email. - Mediterranean Bear
          </Text>
          <Text style={footerLink}>
            <a href={`${siteUrl}/account/settings`} style={footerLink}>
              Manage email preferences
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#faf8f3",
  fontFamily: "Inter, system-ui, sans-serif",
  margin: 0,
  padding: 0,
};
const container = { maxWidth: "560px", margin: "0 auto", padding: "24px" };
const h1 = { color: "#c0392b", fontSize: "24px", marginBottom: "16px" };
const text = { color: "#1a1a1a", fontSize: "14px", lineHeight: "20px" };
const muted = { color: "#6b7280", fontSize: "12px", textAlign: "center" as const };
const footerLink = {
  color: "#6b7280",
  fontSize: "11px",
  textAlign: "center" as const,
  textDecoration: "underline",
};
const card = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};
const hr = { borderColor: "#e5e0d8", margin: "12px 0" };
const button = {
  backgroundColor: "#2d5a4f",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};
