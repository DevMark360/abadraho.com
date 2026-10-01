import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const [w, r, rv] = await Promise.all([
    p.wishlist.count().catch((e) => `ERR: ${e.message}`),
    p.review.count().catch((e) => `ERR: ${e.message}`),
    p.recentView.count().catch((e) => `ERR: ${e.message}`),
  ]);
  console.log(JSON.stringify({ wishlists: w, reviews: r, recent_views: rv }, null, 2));
} finally {
  await p.$disconnect();
}
