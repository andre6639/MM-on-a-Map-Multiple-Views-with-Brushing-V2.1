(function (React$1, ReactDOM, d3$1, topojson) {
  'use strict';

  var React$1__default = 'default' in React$1 ? React$1['default'] : React$1;
  ReactDOM = ReactDOM && Object.prototype.hasOwnProperty.call(ReactDOM, 'default') ? ReactDOM['default'] : ReactDOM;

  const jsonUrl =
    'https://unpkg.com/world-atlas@2.0.2/countries-50m.json';

  const useWorldAtlas = () => {
    const [data, setData] = React$1.useState(null);


    React$1.useEffect(() => {
      d3$1.json(jsonUrl).then(topology => {
        const { countries, land } = topology.objects;
      	setData({
          land: topojson.feature(topology, land),
        	interiors: topojson.mesh(topology, countries, (a, b) => a !== b)
        });
      });
    }, []);
    
    return data;
  };

  const csvUrl =
    'https://gist.githubusercontent.com/andre6639/c40b02a85c7362bc1237b530f7988ff0/raw/c3da73ab6ba569a97f906c2a559ad2dddc2de050/MissingMigrants-ConciseGlobal-2020-11-04T23-14-14.csv';

  const row = (d) => {
    d.coords = d['Location Coordinates']
      .split(',')
      .map((d) => +d)
      .reverse();
    d['Total Dead and Missing'] = +d['Total Dead and Missing'];
    d['Reported Date'] = new Date(d['Reported Date']);
    return d;
  };

  const useData = () => {
    const [data, setData] = React$1.useState(null);

    React$1.useEffect(() => {
      d3$1.csv(csvUrl, row).then(setData);
    }, []);

    return data;
  };

  const projection = d3.geoEqualEarth();
  const path = d3.geoPath(projection);
  const graticule = d3$1.geoGraticule();

  const Marks = ({
    worldAtlas: { land, interiors },
    data,
    sizeScale,
    sizeValue,
  }) => (
    React.createElement( 'g', { className: "marks" },
      React.createElement( 'path', { className: "sphere", d: path({ type: 'Sphere' }) }),
      React.createElement( 'path', { className: "graticules", d: path(graticule()) }),
      land.features.map((feature) => (
        React.createElement( 'path', { className: "land", d: path(feature) })
      )),
      React.createElement( 'path', { className: "interiors", d: path(interiors) }),
      data.map((d) => {
        const [x, y] = projection(d.coords);
        return React.createElement( 'circle', { cx: x, cy: y, r: sizeScale(sizeValue(d)) })
      })
    )
  );

  const BubbleMap = ({ data, worldAtlas }) => {
    const sizeValue = (d) => d['Total Dead and Missing'];
    const maxRadius = 15;

    const sizeScale = d3$1.scaleSqrt()
      .domain([0, d3$1.max(data, sizeValue)])
      .range([0, maxRadius]);

    return (
      React$1__default.createElement( Marks, {
        worldAtlas: worldAtlas, data: data, sizeScale: sizeScale, sizeValue: sizeValue })
    );
  };

  const AxisBottom = ({ xScale, innerHeight, tickFormat, tickOffset = 3 }) =>
    xScale.ticks().map(tickValue => (
      React.createElement( 'g', {
        className: "tick", key: tickValue, transform: `translate(${xScale(tickValue)},0)` },
        React.createElement( 'line', { y2: innerHeight }),
        React.createElement( 'text', { style: { textAnchor: 'middle' }, dy: ".71em", y: innerHeight + tickOffset },
          tickFormat(tickValue)
        )
      )
    ));

  const AxisLeft = ({ yScale, innerWidth, tickOffset = 3 }) =>
    yScale.ticks().map(tickValue => (
      React.createElement( 'g', { className: "tick", transform: `translate(0,${yScale(tickValue)})` },
        React.createElement( 'line', { x2: innerWidth }),
        React.createElement( 'text', {
          key: tickValue, style: { textAnchor: 'end' }, x: -tickOffset, dy: ".32em" },
          tickValue
        )
      )
    ));

  const Marks$1 = ({
    binnedData,
    xScale,
    yScale,
    xValue,
    yValue,
    tooltipFormat,
    circleRadius,
    innerHeight,
  }) =>
    binnedData.map((d) => (
      React.createElement( 'rect', {
        className: "mark", x: xScale(d.x0), y: yScale(d.y), width: xScale(d.x1) - xScale(d.x0), height: innerHeight - yScale(d.y) },
        React.createElement( 'title', null, tooltipFormat(d.y) )
      )
    ));

  const margin = { top: 0, right: 30, bottom: 20, left: 50 };

  const xAxisLabelOffset = 80;
  const yAxisLabelOffset = 30;

  const DateHistogram = ({
    data,
    width,
    height,
    setBrushExtent,
    xValue,
  }) => {
    const xAxisLabel = 'Time';

    const yValue = (d) => d['Total Dead and Missing'];
    const yAxisLabel = 'Total Dead and Missing';

    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;

    //       d['Total Dead and Missing'] = +d['Total Dead and Missing'];
    //       d['Reported Date'] = new Date(d['Reported Date']);

    const xAxisTickFormat = d3$1.timeFormat('%m/%d/%Y');

    const xScale = d3$1.scaleTime()
      .domain(d3$1.extent(data, xValue))
      .range([0, innerWidth])
      .nice();

    const [start, stop] = xScale.domain();

    const binnedData = d3$1.histogram()
      .value(xValue)
      .domain(xScale.domain())
      .thresholds(d3$1.timeMonths(start, stop))(data)
      .map((array) => ({
        y: d3$1.sum(array, yValue),
        x0: array.x0,
        x1: array.x1,
      }));

    const yScale = d3$1.scaleLinear()
      .domain([0, d3$1.max(binnedData, (d) => d.y)])
      .range([innerHeight, 0]);

    const brushRef = React$1.useRef();

    React$1.useEffect(() => {
      const brush = d3$1.brushX().extent([
        [0, 0],
        [innerWidth, innerHeight],
      ]);
      brush(d3$1.select(brushRef.current));
      brush.on('brush end', () => {
        setBrushExtent(d3$1.event.selection && d3$1.event.selection.map(xScale.invert));
      });
    }, [innerWidth, innerHeight]);

    return (
      React.createElement( React.Fragment, null,
        React.createElement( 'rect', { width: width, height: height, fill: "white" }),
        React.createElement( 'g', { transform: `translate(${margin.left},${margin.top})` },
          React.createElement( AxisBottom, {
            xScale: xScale, innerHeight: innerHeight, tickFormat: xAxisTickFormat, tickOffset: 5 }),
          React.createElement( 'text', {
            className: "axis-label", textAnchor: "middle", transform: `translate(${-yAxisLabelOffset},${
            innerHeight / 2
          }) rotate(-90)` },
            yAxisLabel
          ),
          React.createElement( AxisLeft, { yScale: yScale, innerWidth: innerWidth, tickOffset: 5 }),
          React.createElement( 'text', {
            className: "axis-label", x: innerWidth / 2, y: innerHeight + xAxisLabelOffset, textAnchor: "middle" },
            xAxisLabel
          ),
          React.createElement( Marks$1, {
            binnedData: binnedData, xScale: xScale, yScale: yScale, tooltipFormat: (d) => d, circleRadius: 2, innerHeight: innerHeight }),
          React.createElement( 'g', { ref: brushRef })
        )
      )
    );
  };

  // import {  } from 'd3';

  const width = 960;
  const height = 500;
  const dateHistogramSize = 0.224;

  const xValue = d => d['Reported Date'];

  const App = () => {
    const worldAtlas = useWorldAtlas();
    const data = useData();
    const [brushExtent, setBrushExtent] = React$1.useState();

    if (!worldAtlas || !data) {
      return React$1__default.createElement( 'pre', null, "Loading..." );
    }
    
    const filteredData = brushExtent ? data.filter(d => {
      const date = xValue(d);
      return date > brushExtent[0] && date < brushExtent[1];
    }) : data;

    return (
      React$1__default.createElement( 'svg', { width: width, height: height },
        React$1__default.createElement( BubbleMap, { data: filteredData, worldAtlas: worldAtlas }),
        React$1__default.createElement( 'g', { transform: `translate(0, ${height - dateHistogramSize * height})` },
          React$1__default.createElement( DateHistogram, {
            data: data, width: width, height: dateHistogramSize * height, setBrushExtent: setBrushExtent, xValue: xValue })
        )
      )
    );
  };
  const rootElement = document.getElementById('root');
  ReactDOM.render(React$1__default.createElement( App, null ), rootElement);

}(React, ReactDOM, d3, topojson));

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbInVzZVdvcmxkQXRsYXMuanMiLCJ1c2VEYXRhLmpzIiwiQnViYmxlTWFwL01hcmtzLmpzIiwiQnViYmxlTWFwL2luZGV4LmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzQm90dG9tLmpzIiwiRGF0ZUhpc3RvZ3JhbS9BeGlzTGVmdC5qcyIsIkRhdGVIaXN0b2dyYW0vTWFya3MuanMiLCJEYXRlSGlzdG9ncmFtL2luZGV4LmpzIiwiaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgZmVhdHVyZSwgbWVzaCB9IGZyb20gJ3RvcG9qc29uJztcblxuY29uc3QganNvblVybCA9XG4gICdodHRwczovL3VucGtnLmNvbS93b3JsZC1hdGxhc0AyLjAuMi9jb3VudHJpZXMtNTBtLmpzb24nO1xuXG5leHBvcnQgY29uc3QgdXNlV29ybGRBdGxhcyA9ICgpID0+IHtcbiAgY29uc3QgW2RhdGEsIHNldERhdGFdID0gdXNlU3RhdGUobnVsbCk7XG5cblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGpzb24oanNvblVybCkudGhlbih0b3BvbG9neSA9PiB7XG4gICAgICBjb25zdCB7IGNvdW50cmllcywgbGFuZCB9ID0gdG9wb2xvZ3kub2JqZWN0cztcbiAgICBcdHNldERhdGEoe1xuICAgICAgICBsYW5kOiBmZWF0dXJlKHRvcG9sb2d5LCBsYW5kKSxcbiAgICAgIFx0aW50ZXJpb3JzOiBtZXNoKHRvcG9sb2d5LCBjb3VudHJpZXMsIChhLCBiKSA9PiBhICE9PSBiKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sIFtdKTtcbiAgXG4gIHJldHVybiBkYXRhO1xufTsiLCJpbXBvcnQgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3N2IH0gZnJvbSAnZDMnO1xuXG5jb25zdCBjc3ZVcmwgPVxuICAnaHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS9hbmRyZTY2MzkvYzQwYjAyYTg1YzczNjJiYzEyMzdiNTMwZjc5ODhmZjAvcmF3L2MzZGE3M2FiNmJhNTY5YTk3ZjkwNmMyYTU1OWFkMmRkZGMyZGUwNTAvTWlzc2luZ01pZ3JhbnRzLUNvbmNpc2VHbG9iYWwtMjAyMC0xMS0wNFQyMy0xNC0xNC5jc3YnO1xuXG5jb25zdCByb3cgPSAoZCkgPT4ge1xuICBkLmNvb3JkcyA9IGRbJ0xvY2F0aW9uIENvb3JkaW5hdGVzJ11cbiAgICAuc3BsaXQoJywnKVxuICAgIC5tYXAoKGQpID0+ICtkKVxuICAgIC5yZXZlcnNlKCk7XG4gIGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXSA9ICtkWydUb3RhbCBEZWFkIGFuZCBNaXNzaW5nJ107XG4gIGRbJ1JlcG9ydGVkIERhdGUnXSA9IG5ldyBEYXRlKGRbJ1JlcG9ydGVkIERhdGUnXSk7XG4gIHJldHVybiBkO1xufTtcblxuZXhwb3J0IGNvbnN0IHVzZURhdGEgPSAoKSA9PiB7XG4gIGNvbnN0IFtkYXRhLCBzZXREYXRhXSA9IHVzZVN0YXRlKG51bGwpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY3N2KGNzdlVybCwgcm93KS50aGVuKHNldERhdGEpO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuIiwiaW1wb3J0IHsgZ2VvUGF0aCwgZ2VvTmF0dXJhbEVhcnRoMSwgZ2VvR3JhdGljdWxlIH0gZnJvbSAnZDMnO1xuXG5jb25zdCBwcm9qZWN0aW9uID0gZDMuZ2VvRXF1YWxFYXJ0aCgpO1xuY29uc3QgcGF0aCA9IGQzLmdlb1BhdGgocHJvamVjdGlvbik7XG5jb25zdCBncmF0aWN1bGUgPSBnZW9HcmF0aWN1bGUoKTtcblxuZXhwb3J0IGNvbnN0IE1hcmtzID0gKHtcbiAgd29ybGRBdGxhczogeyBsYW5kLCBpbnRlcmlvcnMgfSxcbiAgZGF0YSxcbiAgc2l6ZVNjYWxlLFxuICBzaXplVmFsdWUsXG59KSA9PiAoXG4gIDxnIGNsYXNzTmFtZT1cIm1hcmtzXCI+XG4gICAgPHBhdGggY2xhc3NOYW1lPVwic3BoZXJlXCIgZD17cGF0aCh7IHR5cGU6ICdTcGhlcmUnIH0pfSAvPlxuICAgIDxwYXRoIGNsYXNzTmFtZT1cImdyYXRpY3VsZXNcIiBkPXtwYXRoKGdyYXRpY3VsZSgpKX0gLz5cbiAgICB7bGFuZC5mZWF0dXJlcy5tYXAoKGZlYXR1cmUpID0+IChcbiAgICAgIDxwYXRoIGNsYXNzTmFtZT1cImxhbmRcIiBkPXtwYXRoKGZlYXR1cmUpfSAvPlxuICAgICkpfVxuICAgIDxwYXRoIGNsYXNzTmFtZT1cImludGVyaW9yc1wiIGQ9e3BhdGgoaW50ZXJpb3JzKX0gLz5cbiAgICB7ZGF0YS5tYXAoKGQpID0+IHtcbiAgICAgIGNvbnN0IFt4LCB5XSA9IHByb2plY3Rpb24oZC5jb29yZHMpO1xuICAgICAgcmV0dXJuIDxjaXJjbGUgY3g9e3h9IGN5PXt5fSByPXtzaXplU2NhbGUoc2l6ZVZhbHVlKGQpKX0gLz5cbiAgICB9KX1cbiAgPC9nPlxuKTtcbiIsImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBzY2FsZVNxcnQsIG1heCB9IGZyb20gJ2QzJztcbmltcG9ydCB7IE1hcmtzIH0gZnJvbSAnLi9NYXJrcyc7XG5cbmV4cG9ydCBjb25zdCBCdWJibGVNYXAgPSAoeyBkYXRhLCB3b3JsZEF0bGFzIH0pID0+IHtcbiAgY29uc3Qgc2l6ZVZhbHVlID0gKGQpID0+IGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXTtcbiAgY29uc3QgbWF4UmFkaXVzID0gMTU7XG5cbiAgY29uc3Qgc2l6ZVNjYWxlID0gc2NhbGVTcXJ0KClcbiAgICAuZG9tYWluKFswLCBtYXgoZGF0YSwgc2l6ZVZhbHVlKV0pXG4gICAgLnJhbmdlKFswLCBtYXhSYWRpdXNdKTtcblxuICByZXR1cm4gKFxuICAgIDxNYXJrc1xuICAgICAgd29ybGRBdGxhcz17d29ybGRBdGxhc31cbiAgICAgIGRhdGE9e2RhdGF9XG4gICAgICBzaXplU2NhbGU9e3NpemVTY2FsZX1cbiAgICAgIHNpemVWYWx1ZT17c2l6ZVZhbHVlfVxuICAgIC8+XG4gICk7XG59OyIsImV4cG9ydCBjb25zdCBBeGlzQm90dG9tID0gKHsgeFNjYWxlLCBpbm5lckhlaWdodCwgdGlja0Zvcm1hdCwgdGlja09mZnNldCA9IDMgfSkgPT5cbiAgeFNjYWxlLnRpY2tzKCkubWFwKHRpY2tWYWx1ZSA9PiAoXG4gICAgPGdcbiAgICAgIGNsYXNzTmFtZT1cInRpY2tcIlxuICAgICAga2V5PXt0aWNrVmFsdWV9XG4gICAgICB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHt4U2NhbGUodGlja1ZhbHVlKX0sMClgfVxuICAgID5cbiAgICAgIDxsaW5lIHkyPXtpbm5lckhlaWdodH0gLz5cbiAgICAgIDx0ZXh0IHN0eWxlPXt7IHRleHRBbmNob3I6ICdtaWRkbGUnIH19IGR5PVwiLjcxZW1cIiB5PXtpbm5lckhlaWdodCArIHRpY2tPZmZzZXR9PlxuICAgICAgICB7dGlja0Zvcm1hdCh0aWNrVmFsdWUpfVxuICAgICAgPC90ZXh0PlxuICAgIDwvZz5cbiAgKSk7XG4iLCJleHBvcnQgY29uc3QgQXhpc0xlZnQgPSAoeyB5U2NhbGUsIGlubmVyV2lkdGgsIHRpY2tPZmZzZXQgPSAzIH0pID0+XG4gIHlTY2FsZS50aWNrcygpLm1hcCh0aWNrVmFsdWUgPT4gKFxuICAgIDxnIGNsYXNzTmFtZT1cInRpY2tcIiB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoMCwke3lTY2FsZSh0aWNrVmFsdWUpfSlgfT5cbiAgICAgIDxsaW5lIHgyPXtpbm5lcldpZHRofSAvPlxuICAgICAgPHRleHRcbiAgICAgICAga2V5PXt0aWNrVmFsdWV9XG4gICAgICAgIHN0eWxlPXt7IHRleHRBbmNob3I6ICdlbmQnIH19XG4gICAgICAgIHg9ey10aWNrT2Zmc2V0fVxuICAgICAgICBkeT1cIi4zMmVtXCJcbiAgICAgID5cbiAgICAgICAge3RpY2tWYWx1ZX1cbiAgICAgIDwvdGV4dD5cbiAgICA8L2c+XG4gICkpO1xuIiwiZXhwb3J0IGNvbnN0IE1hcmtzID0gKHtcbiAgYmlubmVkRGF0YSxcbiAgeFNjYWxlLFxuICB5U2NhbGUsXG4gIHhWYWx1ZSxcbiAgeVZhbHVlLFxuICB0b29sdGlwRm9ybWF0LFxuICBjaXJjbGVSYWRpdXMsXG4gIGlubmVySGVpZ2h0LFxufSkgPT5cbiAgYmlubmVkRGF0YS5tYXAoKGQpID0+IChcbiAgICA8cmVjdFxuICAgICAgY2xhc3NOYW1lPVwibWFya1wiXG4gICAgICB4PXt4U2NhbGUoZC54MCl9XG4gICAgICB5PXt5U2NhbGUoZC55KX1cbiAgICAgIHdpZHRoPXt4U2NhbGUoZC54MSkgLSB4U2NhbGUoZC54MCl9XG4gICAgICBoZWlnaHQ9e2lubmVySGVpZ2h0IC0geVNjYWxlKGQueSl9XG4gICAgPlxuICAgICAgPHRpdGxlPnt0b29sdGlwRm9ybWF0KGQueSl9PC90aXRsZT5cbiAgICA8L3JlY3Q+XG4gICkpOyIsImltcG9ydCB7XG4gIHNjYWxlTGluZWFyLFxuICBzY2FsZVRpbWUsXG4gIG1heCxcbiAgdGltZUZvcm1hdCxcbiAgZXh0ZW50LFxuICBoaXN0b2dyYW0gYXMgYmluLFxuICB0aW1lTW9udGhzLFxuICBzdW0sXG4gIGJydXNoWCxcbiAgc2VsZWN0LFxuICBldmVudCxcbn0gZnJvbSAnZDMnO1xuaW1wb3J0IHsgdXNlUmVmLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBBeGlzQm90dG9tIH0gZnJvbSAnLi9BeGlzQm90dG9tJztcbmltcG9ydCB7IEF4aXNMZWZ0IH0gZnJvbSAnLi9BeGlzTGVmdCc7XG5pbXBvcnQgeyBNYXJrcyB9IGZyb20gJy4vTWFya3MnO1xuXG5jb25zdCBtYXJnaW4gPSB7IHRvcDogMCwgcmlnaHQ6IDMwLCBib3R0b206IDIwLCBsZWZ0OiA1MCB9O1xuXG5jb25zdCB4QXhpc0xhYmVsT2Zmc2V0ID0gODA7XG5jb25zdCB5QXhpc0xhYmVsT2Zmc2V0ID0gMzA7XG5cbmV4cG9ydCBjb25zdCBEYXRlSGlzdG9ncmFtID0gKHtcbiAgZGF0YSxcbiAgd2lkdGgsXG4gIGhlaWdodCxcbiAgc2V0QnJ1c2hFeHRlbnQsXG4gIHhWYWx1ZSxcbn0pID0+IHtcbiAgY29uc3QgeEF4aXNMYWJlbCA9ICdUaW1lJztcblxuICBjb25zdCB5VmFsdWUgPSAoZCkgPT4gZFsnVG90YWwgRGVhZCBhbmQgTWlzc2luZyddO1xuICBjb25zdCB5QXhpc0xhYmVsID0gJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnO1xuXG4gIGNvbnN0IGlubmVySGVpZ2h0ID0gaGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG4gIGNvbnN0IGlubmVyV2lkdGggPSB3aWR0aCAtIG1hcmdpbi5sZWZ0IC0gbWFyZ2luLnJpZ2h0O1xuXG4gIC8vICAgICAgIGRbJ1RvdGFsIERlYWQgYW5kIE1pc3NpbmcnXSA9ICtkWydUb3RhbCBEZWFkIGFuZCBNaXNzaW5nJ107XG4gIC8vICAgICAgIGRbJ1JlcG9ydGVkIERhdGUnXSA9IG5ldyBEYXRlKGRbJ1JlcG9ydGVkIERhdGUnXSk7XG5cbiAgY29uc3QgeEF4aXNUaWNrRm9ybWF0ID0gdGltZUZvcm1hdCgnJW0vJWQvJVknKTtcblxuICBjb25zdCB4U2NhbGUgPSBzY2FsZVRpbWUoKVxuICAgIC5kb21haW4oZXh0ZW50KGRhdGEsIHhWYWx1ZSkpXG4gICAgLnJhbmdlKFswLCBpbm5lcldpZHRoXSlcbiAgICAubmljZSgpO1xuXG4gIGNvbnN0IFtzdGFydCwgc3RvcF0gPSB4U2NhbGUuZG9tYWluKCk7XG5cbiAgY29uc3QgYmlubmVkRGF0YSA9IGJpbigpXG4gICAgLnZhbHVlKHhWYWx1ZSlcbiAgICAuZG9tYWluKHhTY2FsZS5kb21haW4oKSlcbiAgICAudGhyZXNob2xkcyh0aW1lTW9udGhzKHN0YXJ0LCBzdG9wKSkoZGF0YSlcbiAgICAubWFwKChhcnJheSkgPT4gKHtcbiAgICAgIHk6IHN1bShhcnJheSwgeVZhbHVlKSxcbiAgICAgIHgwOiBhcnJheS54MCxcbiAgICAgIHgxOiBhcnJheS54MSxcbiAgICB9KSk7XG5cbiAgY29uc3QgeVNjYWxlID0gc2NhbGVMaW5lYXIoKVxuICAgIC5kb21haW4oWzAsIG1heChiaW5uZWREYXRhLCAoZCkgPT4gZC55KV0pXG4gICAgLnJhbmdlKFtpbm5lckhlaWdodCwgMF0pO1xuXG4gIGNvbnN0IGJydXNoUmVmID0gdXNlUmVmKCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBicnVzaCA9IGJydXNoWCgpLmV4dGVudChbXG4gICAgICBbMCwgMF0sXG4gICAgICBbaW5uZXJXaWR0aCwgaW5uZXJIZWlnaHRdLFxuICAgIF0pO1xuICAgIGJydXNoKHNlbGVjdChicnVzaFJlZi5jdXJyZW50KSk7XG4gICAgYnJ1c2gub24oJ2JydXNoIGVuZCcsICgpID0+IHtcbiAgICAgIHNldEJydXNoRXh0ZW50KGV2ZW50LnNlbGVjdGlvbiAmJiBldmVudC5zZWxlY3Rpb24ubWFwKHhTY2FsZS5pbnZlcnQpKTtcbiAgICB9KTtcbiAgfSwgW2lubmVyV2lkdGgsIGlubmVySGVpZ2h0XSk7XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPHJlY3Qgd2lkdGg9e3dpZHRofSBoZWlnaHQ9e2hlaWdodH0gZmlsbD1cIndoaXRlXCIgLz5cbiAgICAgIDxnIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke21hcmdpbi5sZWZ0fSwke21hcmdpbi50b3B9KWB9PlxuICAgICAgICA8QXhpc0JvdHRvbVxuICAgICAgICAgIHhTY2FsZT17eFNjYWxlfVxuICAgICAgICAgIGlubmVySGVpZ2h0PXtpbm5lckhlaWdodH1cbiAgICAgICAgICB0aWNrRm9ybWF0PXt4QXhpc1RpY2tGb3JtYXR9XG4gICAgICAgICAgdGlja09mZnNldD17NX1cbiAgICAgICAgLz5cbiAgICAgICAgPHRleHRcbiAgICAgICAgICBjbGFzc05hbWU9XCJheGlzLWxhYmVsXCJcbiAgICAgICAgICB0ZXh0QW5jaG9yPVwibWlkZGxlXCJcbiAgICAgICAgICB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsteUF4aXNMYWJlbE9mZnNldH0sJHtcbiAgICAgICAgICAgIGlubmVySGVpZ2h0IC8gMlxuICAgICAgICAgIH0pIHJvdGF0ZSgtOTApYH1cbiAgICAgICAgPlxuICAgICAgICAgIHt5QXhpc0xhYmVsfVxuICAgICAgICA8L3RleHQ+XG4gICAgICAgIDxBeGlzTGVmdCB5U2NhbGU9e3lTY2FsZX0gaW5uZXJXaWR0aD17aW5uZXJXaWR0aH0gdGlja09mZnNldD17NX0gLz5cbiAgICAgICAgPHRleHRcbiAgICAgICAgICBjbGFzc05hbWU9XCJheGlzLWxhYmVsXCJcbiAgICAgICAgICB4PXtpbm5lcldpZHRoIC8gMn1cbiAgICAgICAgICB5PXtpbm5lckhlaWdodCArIHhBeGlzTGFiZWxPZmZzZXR9XG4gICAgICAgICAgdGV4dEFuY2hvcj1cIm1pZGRsZVwiXG4gICAgICAgID5cbiAgICAgICAgICB7eEF4aXNMYWJlbH1cbiAgICAgICAgPC90ZXh0PlxuICAgICAgICA8TWFya3NcbiAgICAgICAgICBiaW5uZWREYXRhPXtiaW5uZWREYXRhfVxuICAgICAgICAgIHhTY2FsZT17eFNjYWxlfVxuICAgICAgICAgIHlTY2FsZT17eVNjYWxlfVxuICAgICAgICAgIHRvb2x0aXBGb3JtYXQ9eyhkKSA9PiBkfVxuICAgICAgICAgIGNpcmNsZVJhZGl1cz17Mn1cbiAgICAgICAgICBpbm5lckhlaWdodD17aW5uZXJIZWlnaHR9XG4gICAgICAgIC8+XG4gICAgICAgIDxnIHJlZj17YnJ1c2hSZWZ9IC8+XG4gICAgICA8L2c+XG4gICAgPC8+XG4gICk7XG59O1xuIiwiLy8gaW1wb3J0IHsgIH0gZnJvbSAnZDMnO1xuaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IFJlYWN0RE9NIGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQgeyB1c2VXb3JsZEF0bGFzIH0gZnJvbSAnLi91c2VXb3JsZEF0bGFzJztcbmltcG9ydCB7IHVzZURhdGEgfSBmcm9tICcuL3VzZURhdGEnO1xuaW1wb3J0IHsgQnViYmxlTWFwIH0gZnJvbSAnLi9CdWJibGVNYXAvaW5kZXguanMnO1xuaW1wb3J0IHsgRGF0ZUhpc3RvZ3JhbSB9IGZyb20gJy4vRGF0ZUhpc3RvZ3JhbS9pbmRleC5qcyc7XG5cbmNvbnN0IHdpZHRoID0gOTYwO1xuY29uc3QgaGVpZ2h0ID0gNTAwO1xuY29uc3QgZGF0ZUhpc3RvZ3JhbVNpemUgPSAwLjIyNDtcblxuY29uc3QgeFZhbHVlID0gZCA9PiBkWydSZXBvcnRlZCBEYXRlJ107XG5cbmNvbnN0IEFwcCA9ICgpID0+IHtcbiAgY29uc3Qgd29ybGRBdGxhcyA9IHVzZVdvcmxkQXRsYXMoKTtcbiAgY29uc3QgZGF0YSA9IHVzZURhdGEoKTtcbiAgY29uc3QgW2JydXNoRXh0ZW50LCBzZXRCcnVzaEV4dGVudF0gPSB1c2VTdGF0ZSgpO1xuXG4gIGlmICghd29ybGRBdGxhcyB8fCAhZGF0YSkge1xuICAgIHJldHVybiA8cHJlPkxvYWRpbmcuLi48L3ByZT47XG4gIH1cbiAgXG4gIGNvbnN0IGZpbHRlcmVkRGF0YSA9IGJydXNoRXh0ZW50ID8gZGF0YS5maWx0ZXIoZCA9PiB7XG4gICAgY29uc3QgZGF0ZSA9IHhWYWx1ZShkKTtcbiAgICByZXR1cm4gZGF0ZSA+IGJydXNoRXh0ZW50WzBdICYmIGRhdGUgPCBicnVzaEV4dGVudFsxXTtcbiAgfSkgOiBkYXRhO1xuXG4gIHJldHVybiAoXG4gICAgPHN2ZyB3aWR0aD17d2lkdGh9IGhlaWdodD17aGVpZ2h0fT5cbiAgICAgIDxCdWJibGVNYXAgZGF0YT17ZmlsdGVyZWREYXRhfSB3b3JsZEF0bGFzPXt3b3JsZEF0bGFzfSAvPlxuICAgICAgPGcgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKDAsICR7aGVpZ2h0IC0gZGF0ZUhpc3RvZ3JhbVNpemUgKiBoZWlnaHR9KWB9PlxuICAgICAgICA8RGF0ZUhpc3RvZ3JhbVxuICAgICAgICAgIGRhdGE9e2RhdGF9XG4gICAgICAgICAgd2lkdGg9e3dpZHRofVxuICAgICAgICAgIGhlaWdodD17ZGF0ZUhpc3RvZ3JhbVNpemUgKiBoZWlnaHR9XG4gICAgICAgICAgc2V0QnJ1c2hFeHRlbnQ9e3NldEJydXNoRXh0ZW50fVxuICAgICAgICAgIHhWYWx1ZT17eFZhbHVlfVxuICAgICAgICAvPlxuICAgICAgPC9nPlxuICAgIDwvc3ZnPlxuICApO1xufTtcbmNvbnN0IHJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jvb3QnKTtcblJlYWN0RE9NLnJlbmRlcig8QXBwIC8+LCByb290RWxlbWVudCk7Il0sIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlRWZmZWN0IiwianNvbiIsImZlYXR1cmUiLCJtZXNoIiwiY3N2IiwiZ2VvR3JhdGljdWxlIiwic2NhbGVTcXJ0IiwibWF4IiwiUmVhY3QiLCJNYXJrcyIsInRpbWVGb3JtYXQiLCJzY2FsZVRpbWUiLCJleHRlbnQiLCJiaW4iLCJ0aW1lTW9udGhzIiwic3VtIiwic2NhbGVMaW5lYXIiLCJ1c2VSZWYiLCJicnVzaFgiLCJzZWxlY3QiLCJldmVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0VBSUEsTUFBTSxPQUFPO0VBQ2IsRUFBRSx3REFBd0QsQ0FBQztBQUMzRDtFQUNPLE1BQU0sYUFBYSxHQUFHLE1BQU07RUFDbkMsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHQSxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDO0FBQ0E7RUFDQSxFQUFFQyxpQkFBUyxDQUFDLE1BQU07RUFDbEIsSUFBSUMsU0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUk7RUFDbkMsTUFBTSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7RUFDbkQsS0FBSyxPQUFPLENBQUM7RUFDYixRQUFRLElBQUksRUFBRUMsZ0JBQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO0VBQ3JDLE9BQU8sU0FBUyxFQUFFQyxhQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxD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