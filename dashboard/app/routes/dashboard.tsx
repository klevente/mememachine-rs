import { json, Link, useLoaderData, type MetaFunction } from "@remix-run/react";
import { eq, sql } from "drizzle-orm";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ChartConfig, ChartContainer } from "~/components/ui/chart";
import { db } from "~/db/config.server";
import { soundPlays } from "~/db/schema.server";

export const meta: MetaFunction = () => {
  return [{ title: "Mememachine :: Dashboard" }];
};

export async function loader() {
  const allStatisticsPromise = db
    .select({
      soundName: soundPlays.soundName,
      plays: sql<number>`count(*)`,
    })
    .from(soundPlays)
    .groupBy(soundPlays.soundName)
    .orderBy(soundPlays.soundName);
  const randomStatisticsPromise = db
    .select({
      soundName: soundPlays.soundName,
      plays: sql<number>`count(*)`,
    })
    .from(soundPlays)
    .where(eq(soundPlays.isRandom, true))
    .groupBy(soundPlays.soundName)
    .orderBy(soundPlays.soundName);

  const dedicatedStatisticsPromise = db
    .select({
      soundName: soundPlays.soundName,
      plays: sql<number>`count(*)`,
    })
    .from(soundPlays)
    .where(eq(soundPlays.isRandom, false))
    .groupBy(soundPlays.soundName)
    .orderBy(soundPlays.soundName);

  const [allStatistics, randomStatistics, dedicatedSoundStatistics] =
    await Promise.all([
      allStatisticsPromise,
      randomStatisticsPromise,
      dedicatedStatisticsPromise,
    ]);

  return json({
    allStatistics,
    randomStatistics,
    dedicatedSoundStatistics,
  });
}

export default function Dashboard() {
  const { allStatistics, randomStatistics, dedicatedSoundStatistics } =
    useLoaderData<typeof loader>();

  const chartConfig = {
    plays: {
      label: "Plays",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <div className="max-w-full">
      <header className="flex justify-between">
        <Link to="/dashboard">
          <h1 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <img src="/favicon.ico" alt="icon" className="w-8 img-pixelated" />{" "}
            Mememachine Dashboard
          </h1>
        </Link>
      </header>
      <div className="flex gap-4 flex-col items-center">
        <Card className="flex-1 w-full">
          <CardHeader>
            <CardTitle>All Plays</CardTitle>
            <CardDescription>
              Distribution of all sounds played by MemeMachine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full"
            >
              <BarChart accessibilityLayer data={allStatistics}>
                <XAxis dataKey="soundName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plays" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Random Plays</CardTitle>
            <CardDescription>
              Distribution of random sounds (initiated by <code>%random</code>)
              played by MemeMachine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full"
            >
              <BarChart accessibilityLayer data={randomStatistics}>
                <XAxis dataKey="soundName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plays" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Dedicated Plays</CardTitle>
            <CardDescription>
              Distribution of dedicated sounds (initiated by{" "}
              <code>&lt;%sound&gt;</code>) played by MemeMachine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full"
            >
              <BarChart accessibilityLayer data={dedicatedSoundStatistics}>
                <XAxis dataKey="soundName" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="plays" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
