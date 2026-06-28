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

import type { OrderDTO } from "@/lib/orders/queries";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

/**
 * Shipping confirmation email sent when Printful reports a package shipped.
 */
export function ShippingConfirmationEmail({
  order,
  trackingNumber,
  carrier,
}: {
  order: OrderDTO;
  trackingNumber: string;
  carrier: string;
}) {
  const trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${carrier} tracking ${trackingNumber}`,
  )}`;

  return (
    <Html>
      <Head />
      <Preview>
        Your order {order.orderNumber} has shipped
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Your order is on its way</Heading>
          <Text style={text}>
            Good news - your order {order.orderNumber} has shipped.
          </Text>

          <Section style={card}>
            <Text style={label}>Tracking number</Text>
            <Text style={value}>{trackingNumber}</Text>
            <Text style={label}>Carrier</Text>
            <Text style={value}>{carrier}</Text>
          </Section>

          <Section style={{ textAlign: "center", marginTop: "16px" }}>
            <Button style={button} href={trackingUrl}>
              Track your package
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={card}>
            {order.items.map((item) => (
              <Section key={item.id} style={itemRow}>
                <Text style={itemName}>
                  {item.productName} - {item.variantColor}
                  {item.variantSize ? ` - Size ${item.variantSize}` : ""}
                </Text>
                <Text style={itemMeta}>Qty {item.quantity}</Text>
              </Section>
            ))}
            <Hr style={hr} />
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
            </Text>
          </Section>

          <Text style={text}>
            View your order status anytime:{" "}
            <a href={`${siteUrl}/order/${order.id}`} style={link}>
              {siteUrl}/order/{order.id}
            </a>
          </Text>

          <Hr style={hr} />
          <Text style={muted}>Mediterranean Bear - {siteUrl}</Text>
          <Text style={footerLink}>
            You received this email because your order shipped.{" "}
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
const link = { color: "#2d5a4f", textDecoration: "underline" };
