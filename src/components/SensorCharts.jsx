import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { CHART_OPTIONS } from "../config/map";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/** Converts an array of SensorThings observations into chart-ready {labels, data}. */
function toChartData(observations) {
  return observations
    .slice()
    .reverse()
    .reduce(
      (acc, obs) => {
        const date = new Date(obs.phenomenonTime);
        acc.labels.push(`${date.getHours()}:00`);
        acc.data.push(obs.result);
        return acc;
      },
      { labels: [], data: [] },
    );
}

function SensorLine({ title, observations, color }) {
  if (!observations?.length) return null;

  const { labels, data } = toChartData(observations);

  return (
    <div className="sensor-chart">
      <h3>{title}</h3>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: title,
              data,
              borderColor: color,
              backgroundColor: color.replace("1)", "0.2)"),
              tension: 0.3,
            },
          ],
        }}
        options={CHART_OPTIONS}
      />
    </div>
  );
}

/**
 * Renders the three 24-hour sensor trend charts:
 * temperature, humidity, and structural vibration.
 */
export default function SensorCharts({ timeSeriesData }) {
  if (!timeSeriesData) return null;

  return (
    <>
      <SensorLine
        title="24-Hour Temperature Trend"
        observations={timeSeriesData.temperature}
        color="rgba(255, 99, 132, 1)"
      />
      <SensorLine
        title="24-Hour Humidity Trend"
        observations={timeSeriesData.humidity}
        color="rgba(99, 179, 237, 1)"
      />
      <SensorLine
        title="24-Hour Structural Vibration"
        observations={timeSeriesData.vibration}
        color="rgba(154, 230, 180, 1)"
      />
    </>
  );
}
