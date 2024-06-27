export interface BenchmarkAdapter {
    worldLoadTime: number
    averageRenderTime: number
    worstRenderTime: number
    memoryUsageAverage: number
    memoryUsageWorst: number
}
