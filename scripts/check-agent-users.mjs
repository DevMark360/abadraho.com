import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const rows = await p.$queryRawUnsafe(
  `SELECT user_type_id, COUNT(*) AS c FROM users WHERE is_archive = 0 GROUP BY user_type_id ORDER BY c DESC LIMIT 15`
);
console.log("users by type:", rows);

const types = await p.$queryRawUnsafe(
  `SELECT id, user_type_name FROM user_types WHERE user_type_name LIKE '%agent%' OR user_type_name LIKE '%broker%' OR user_type_name LIKE '%Agent%'`
);
console.log("agent/broker types:", types);

const brokers = await p.broker.count();
console.log("brokers total:", brokers);

const allTypes = await p.$queryRawUnsafe(
  `SELECT id, user_type_name FROM user_types ORDER BY id`
);
console.log("all user_types:", allTypes);

await p.$disconnect();
