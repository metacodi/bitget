

if [%1]==[metacodi] (
  npx ts-node publish/upgrade-metacodi-dependencies.ts
)

if [%1]==[pub] (
  if [%2]==[] (
    npx ts-node publish/publish.ts
  ) else (
    npx ts-node publish/publish.ts -c \"%2 %3 %4 %5 %6 %7 %8 %9\"
  )
)

if [%1]==[test] (
  if [%2]==[api] (
    npx ts-node test/test-api.ts
  ) else if [%2]==[user] (
    npx ts-node test/test-ws-user.ts
  ) else if [%2]==[req] (
    npx ts-node test/test-req.ts
  ) else if [%2]==[metabot] (
    npx ts-node test/do-metabot.ts
  ) else (
    npx ts-node test/test-ws-market.ts
  )
)


if [%1]==[metabot] (
  npx ts-node test/do-metabot.ts
)
