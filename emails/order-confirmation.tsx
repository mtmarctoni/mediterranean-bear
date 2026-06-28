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
 * Order confirmation email sent after a Stripe payment is confirmed.
 * Branded with Mediterranean Bear colors (pine green + sunset gold).
 */
export function OrderConfirmationEmail({
  order,
}: {
  order: OrderDTO;
}) {
  return (
    <Html>
      <Head />
      <Preview>
        Order {order.orderNumber} confirmed - thank you for your purchase
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Thank you for your order</Heading>
          <Text style={text}>
            We&apos;ve received your payment and your order is being prepared.
          </Text>

          <Section style={card}>
            <Text style={label}>Order number</Text>
            <Text style={value}>{order.orderNumber}</Text>
            <Hr style={hr} />
            {order.items.map((item) => (
              <Section key={item.id} style={itemRow}>
                <Text style={itemName}>
                  {item.productName} - {item.variantColor}
                  {item.variantSize ? ` - Size ${item.variantSize}` : ""}
                </Text>
                <Text style={itemMeta}>
                  Qty {item.quantity} - {formatPrice(item.unitPriceCents)} each
                </Text>
              </Section>
            ))}
            <Hr style={hr} />
            <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
            <Row label="Shipping" value={formatPrice(order.shippingCents)} />
            <Row label="Tax" value={formatPrice(order.taxCents)} />
            <Hr style={hr} />
            <Row
              label="Total"
              value={formatPrice(order.totalCents)}
              bold
            />
          </Section>

          <Section style={card}>
            <Text style={label}>Shipping to</Text>
            <Text style={value}>
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2
                ? `, ${order.shippingAddress.line2}`
                : ""}
              <br />
              {order.shippingAddress.zip} {order.shippingAddress.city}
              <br />
              {order.shippingAddress.countryCode}
            </Text>
          </Section>

          <Text style={text}>
            Estimated delivery: 2-7 business days. You&apos;ll receive a
            shipping confirmation with tracking once your order ships.
          </Text>

          <Section style={{ textAlign: "center", marginTop: "24px" }}>
            <Button
              style={button}
              href={`${siteUrl}/order/${order.id}`}
            >
              View your order
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={muted}>
            Mediterranean Bear - {siteUrl}
          </Text>
          <Text style={footerLink}>
            You received this email because you placed an order.{" "}
            <a href={`${siteUrl}/account/settings`} style={footerLink}>
              Manage email preferences
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Section
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "4px",
        ...(bold ? { fontWeight: 700, fontSize: "16px" } : {}),
      }}
    >
      <Text style={{ ...text, margin: 0 }}>{label}</Text>
      <Text style={{ ...text, margin: 0 }}>{value}</Text>
    </Section>
  );
}

const body = {
  backgroundColor: "#faf8f3",
  fontFamily: "Inter, system-ui, sans-serif",
  margin: 0,
  padding: 0,
};
const container = { maxWidth: "560px", margin: "0 auto", padding: "24px" };
const h1 = { color: "#2d5a4f", fontSize: "24px", marginBottom: "16px" };
const text = { color: "#1a1a1a", fontSize: "14px", lineHeight: "20px" };
const muted = { color: "#6b7280", fontSize: "12px", textAlign: "center" as const };
const footerLink = {
  color: "#6b7280",
  fontSize: "11px",
  textAlign: "center" as const,
  textDecoration: "underline",
};
const label = { color: "#6b7280", fontSize: "12px", margin: 0 };
const value = { color: "#1a1a1a", fontSize: "14px", margin: "2px 0 0 0" };
const card = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};
const hr = { borderColor: "#e5e0d8", margin: "12px 0" };
const itemRow = { marginBottom: "8px" };
const itemName = { color: "#1a1a1a", fontSize: "14px", margin: 0, fontWeight: 600 };
const itemMeta = { color: "#6b7280", fontSize: "12px", margin: 0 };
const button = {
  backgroundColor: "#2d5a4f",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};
