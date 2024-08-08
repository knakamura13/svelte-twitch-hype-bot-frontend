<script lang="ts">
    import { Line } from 'svelte-chartjs';
    import {
        CategoryScale,
        Chart as ChartJS,
        Filler,
        Legend,
        LinearScale,
        LineElement,
        PointElement,
        Title,
        SubTitle,
        Tooltip
    } from 'chart.js';
    import type { ChartArea, ChartData, ChartOptions, Color, Point } from 'chart.js';
    import axios from 'axios';

    // Register required Chart.js components
    ChartJS.register(
        Title,
        SubTitle,
        Tooltip,
        Legend,
        Filler,
        LineElement,
        LinearScale,
        PointElement,
        CategoryScale
    );

    let chartData: ChartData<'line', (number | Point)[]>;

    const options: ChartOptions<'line'> = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
                position: 'top'
            },
            title: {
                display: true,
                text: "Today's +2 Stats in NL's Chat",
                color: "rgba(255, 255, 255, 0.9)",
                font: {
                    size: 20
                }
            },
            subtitle: {
                display: true,
                text: "Average value of +2 and -2 messages over time in Northernlion's chat today",
                color: "rgba(255, 255, 255, 0.7)",
                padding: {
                    top: 0,
                    bottom: 10
                }
            },
            filler: {
                drawTime: 'beforeDraw',
                propagate: false
            },
            tooltip: {
                displayColors: false,
                animation: {
                    duration: 0.1
                },
                titleFont: {
                    size: 12
                },
                callbacks: {
                    title: function(context) {
                        const yValue = context[0].parsed.y;
                        const sign = yValue >= 0? '+' : '-';
                        return `${sign}${Math.abs(yValue)}`;
                    },
                    label: function(context) {
                        const date = new Date(context.label);
                        return date.toLocaleString('en-US', {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'category',
                title: {
                    display: true,
                    text: 'Time',
                    color: 'rgba(255, 255, 255, 1.0)',
                    font: {
                        size: 16
                    }
                },
                ticks: {
                    autoSkip: true,
                    callback: function(_, index, __) {
                        const date = new Date(this.getLabelForValue(index));
                        const hours = date.getHours();
                        if (hours >= 8 && hours <= 15) {
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h24' });
                        }
                        return '';
                    },
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        size: 10
                    },
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Average Value',
                    color: 'rgba(255, 255, 255, 1.0)',
                    font: {
                        size: 16
                    }
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        }
    };

    async function fetchHypeStats(): Promise<{ hypeData: number[]; hypeTimes: Date[]  }> {
        const response = await axios.get('/api/hype_stats');
        const data = response.data;

        // Filter out invalid dates and invalid averages from the API response
        const filteredResponseData = data.filter((item: any) => item?.timestamp && item.movingAverage !== undefined);

        // Extract times and hype averages from the filtered response data
        const hypeTimes = filteredResponseData.map((item: any) => {
            const date = new Date(item.timestamp);
            const hours = date.getHours();
            if (hours >= 8 && hours <= 15) {
                return date.toISOString();  // Use ISO string format for consistent parsing
            }
            return null;
        }).filter((item: any) => item !== null);

        const hypeData = filteredResponseData.map((item: any) => {
            const date = new Date(item.timestamp);
            const hours = date.getHours();
            if (hours >= 8 && hours <= 15) {
                return Math.abs(item.movingAverage) >= 4 ? item.movingAverage : 0;
            }
            return null;
        }).filter((item: any) => item !== null);

        if (hypeTimes.length !== hypeData.length) {
            throw new Error(`Invalid data format: labels and data arrays must have the same length.
            Got lengths ${hypeTimes.length} and ${hypeData.length} respectively.`);
        }

        return {
            hypeTimes,
            hypeData
        };
    }

    function createGradient(ctx: CanvasRenderingContext2D, chartArea: ChartArea): Color {
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        return gradient;
    }

    async function getChartData(): Promise<ChartData<'line', (number | Point)[]>> {
        const { hypeTimes, hypeData } = await fetchHypeStats();

        return {
            labels: hypeTimes,
            datasets: [
                {
                    label: '+2/-2 Messages Moving Average',
                    data: hypeData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        return !!chartArea ? createGradient(ctx, chartArea) : undefined;
                    },
                    fill: true,
                    tension: 0.5,
                    pointRadius: 0,
                    borderWidth: 0.5,
                    pointHitRadius: 20
                }
            ]
        };
    }

    $: if (chartData) {
        chartData.datasets[0].backgroundColor = (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            return !!chartArea ? createGradient(ctx, chartArea) : undefined;
        };
    }
</script>

{#await getChartData()}
    <p>Loading chart...</p>
{:then data}
    {#if data}
        <Line {data} {options} />
    {/if}
{/await}

<style lang="scss">
</style>
