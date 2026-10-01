"use client";

import { Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SocialShareButtons({
  projectName,
  slug,
}: {
  projectName: string;
  slug: string;
}) {
  const share = (network: "twitter" | "linkedin") => {
    const url = encodeURIComponent(
      typeof window !== "undefined"
        ? window.location.href
        : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/project/${slug}`
    );
    const text = encodeURIComponent(projectName);
    const links = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(links[network], "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => share("twitter")}
        aria-label="Share on Twitter"
      >
        <Twitter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => share("linkedin")}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
      </Button>
    </div>
  );
}
