'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { d3Config } from '@/lib/chartConfig'

interface D3ChartProps {
  data: any[]
  width?: number
  height?: number
  title?: string
  type?: 'line' | 'bar' | 'area' | 'scatter'
  xKey: string
  yKey: string
  colorKey?: string
}

export function D3Chart({ 
  data, 
  width = 800, 
  height = 400, 
  title, 
  type = 'line', 
  xKey, 
  yKey, 
  colorKey 
}: D3ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous chart

    const { margin } = d3Config
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Create scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[xKey]) as [number, number])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d[yKey]) as [number, number])
      .range([innerHeight, 0])

    const colorScale = colorKey 
      ? d3.scaleOrdinal(d3Config.colors)
          .domain([...new Set(data.map(d => d[colorKey]))])
      : () => d3Config.colors[0]

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Add title
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('fill', d3Config.darkTheme.textColor)
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(title)
    }

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', d3Config.darkTheme.textColor)

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('fill', d3Config.darkTheme.textColor)

    // Style axis lines
    g.selectAll('.domain')
      .style('stroke', d3Config.darkTheme.axisColor)

    g.selectAll('.tick line')
      .style('stroke', d3Config.darkTheme.gridColor)

    // Render chart based on type
    switch (type) {
      case 'line':
        renderLineChart(g, data, xScale, yScale, colorScale, xKey, yKey, colorKey)
        break
      case 'bar':
        renderBarChart(g, data, xScale, yScale, colorScale, xKey, yKey, colorKey, innerWidth)
        break
      case 'scatter':
        renderScatterPlot(g, data, xScale, yScale, colorScale, xKey, yKey, colorKey)
        break
      case 'area':
        renderAreaChart(g, data, xScale, yScale, xKey, yKey)
        break
    }

  }, [data, width, height, title, type, xKey, yKey, colorKey])

  return <svg ref={svgRef} className="w-full h-full"></svg>
}

function renderLineChart(g: any, data: any[], xScale: any, yScale: any, colorScale: any, xKey: string, yKey: string, colorKey?: string) {
  const line = d3.line()
    .x((d: any) => xScale(d[xKey]))
    .y((d: any) => yScale(d[yKey]))
    .curve(d3.curveMonotoneX)

  if (colorKey) {
    const groupedData = d3.group(data, (d: any) => d[colorKey])
    groupedData.forEach((values, key) => {
      g.append('path')
        .datum(values)
        .attr('fill', 'none')
        .attr('stroke', colorScale(key))
        .attr('stroke-width', 2)
        .attr('d', line)
    })
  } else {
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', colorScale())
      .attr('stroke-width', 2)
      .attr('d', line)
  }
}

function renderBarChart(g: any, data: any[], xScale: any, yScale: any, colorScale: any, xKey: string, yKey: string, colorKey: string | undefined, innerWidth: number) {
  const barWidth = innerWidth / data.length * 0.8

  g.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', (d: any) => xScale(d[xKey]) - barWidth / 2)
    .attr('y', (d: any) => yScale(d[yKey]))
    .attr('width', barWidth)
    .attr('height', (d: any) => yScale(0) - yScale(d[yKey]))
    .attr('fill', (d: any) => colorKey ? colorScale(d[colorKey]) : colorScale())
}

function renderScatterPlot(g: any, data: any[], xScale: any, yScale: any, colorScale: any, xKey: string, yKey: string, colorKey?: string) {
  g.selectAll('.dot')
    .data(data)
    .enter().append('circle')
    .attr('class', 'dot')
    .attr('cx', (d: any) => xScale(d[xKey]))
    .attr('cy', (d: any) => yScale(d[yKey]))
    .attr('r', 4)
    .attr('fill', (d: any) => colorKey ? colorScale(d[colorKey]) : colorScale())
}

function renderAreaChart(g: any, data: any[], xScale: any, yScale: any, xKey: string, yKey: string) {
  const area = d3.area()
    .x((d: any) => xScale(d[xKey]))
    .y0(yScale(0))
    .y1((d: any) => yScale(d[yKey]))
    .curve(d3.curveMonotoneX)

  g.append('path')
    .datum(data)
    .attr('fill', d3Config.colors[0])
    .attr('fill-opacity', 0.7)
    .attr('d', area)
}