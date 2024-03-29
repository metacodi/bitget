#!/bin/sh

FIRST_ARGUMENT="$1"
SECOND_ARGUMENT="$2"
THIRD_ARGUMENT="$3"
CURDIR="$(pwd)"


if [ $FIRST_ARGUMENT == "pub" ] 
then
  npx ts-node publish/publish.ts
fi


if [ $FIRST_ARGUMENT == "metacodi" ] 
then
  npx ts-node publish/upgrade-metacodi-dependencies.ts
fi

if [ $FIRST_ARGUMENT == "test" ] 
then
  npx ts-node test/test-api.ts
fi

if [ $FIRST_ARGUMENT == "wsu" ] 
then
  npx ts-node test/test-ws-user.ts
fi

if [ $FIRST_ARGUMENT == "wsm" ] 
then
  npx ts-node test/test-ws-market.ts
fi


if [ $FIRST_ARGUMENT == "metabot" ] 
then
  npx ts-node test/do-metabot.ts
fi

