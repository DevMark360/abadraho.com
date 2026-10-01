import { CampaignDetailClient } from "@/components/advertising/campaign-detail-client";

export default async function AdvertisingCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetailClient campaignId={Number(id)} />;
}
