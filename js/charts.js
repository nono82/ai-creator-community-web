// =========================================================================
// AI创作者社区 - 原生矢量 Canvas/SVG 高保真图表引擎
// 100% 还原 UI 设计稿视觉效果，支持动态悬浮 Tooltip 与平滑曲线
// =========================================================================

const ChartEngine = {
  // 1. 绘制数据趋势折线图（主系列轻填充，其余纯线，减少视觉噪音）
  drawTrendChart: function(canvasId, dates, seriesData, visibleSeries = ['views', 'likes', 'comments', 'shares']) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 800;
    const height = 280;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = { top: 18, right: 20, bottom: 36, left: 48 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const yTicks = [0, 10, 20, 30, 40];
    const maxVal = 40;

    // 浅底 + 横向网格
    ctx.fillStyle = '#FAFBFC';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(padding.left, padding.top, chartW, chartH, 10);
    } else {
      ctx.rect(padding.left, padding.top, chartW, chartH);
    }
    ctx.fill();

    ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    yTicks.forEach((val, idx) => {
      const y = padding.top + chartH - (val / maxVal) * chartH;
      ctx.beginPath();
      ctx.strokeStyle = idx === 0 ? '#E2E8F0' : '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.fillText(val === 0 ? '0' : val + '万', padding.left - 10, y);
    });

    // X 轴日期：稀疏标注，避免挤在一起
    const stepX = chartW / Math.max(dates.length - 1, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94A3B8';
    const labelStep = dates.length > 8 ? 2 : 1;
    dates.forEach((d, i) => {
      if (i % labelStep !== 0 && i !== dates.length - 1) return;
      const x = padding.left + i * stepX;
      ctx.fillText(d, x, padding.top + chartH + 10);
    });

    const seriesConfig = {
      views: { color: '#6366F1', width: 2.4, fill: true },
      likes: { color: '#10B981', width: 2, fill: false },
      comments: { color: '#8B5CF6', width: 2, fill: false },
      shares: { color: '#F59E0B', width: 2, fill: false }
    };

    function buildPoints(data) {
      return data.map((val, i) => ({
        x: padding.left + i * stepX,
        y: padding.top + chartH - (val / maxVal) * chartH
      }));
    }

    function strokeCurve(points, color, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const cpX = (points[i].x + points[i + 1].x) / 2;
        ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    function fillCurve(points, color) {
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, color + '28');
      grad.addColorStop(0.65, color + '0D');
      grad.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const cpX = (points[i].x + points[i + 1].x) / 2;
        ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
      }
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 先画填充（仅主系列），再画全部线条，保证层次清晰
    const ordered = ['views', 'likes', 'comments', 'shares'].filter(k => visibleSeries.includes(k) && seriesData[k]);
    ordered.forEach(key => {
      const cfg = seriesConfig[key];
      const points = buildPoints(seriesData[key]);
      if (cfg.fill && ordered.length <= 2) {
        fillCurve(points, cfg.color);
      } else if (cfg.fill && key === 'views') {
        fillCurve(points, cfg.color);
      }
    });
    ordered.forEach(key => {
      const cfg = seriesConfig[key];
      const points = buildPoints(seriesData[key]);
      strokeCurve(points, cfg.color, cfg.width);
      // 仅画终点圆点，避免满屏圆点噪点
      const end = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(end.x, end.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();
    });

    canvas._chartState = {
      dates, seriesData, visibleSeries, padding, chartW, chartH, stepX, maxVal, seriesConfig
    };
  },

  // 2. 绘制环形饼图 (Donut Chart)
  drawDonutChart: function(canvasId, segments, centerTitle, centerValue) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Prefer dedicated box width; never use the full flex-row parent width
    const box = canvas.closest('.donut-canvas-box') || canvas.parentElement;
    const size = Math.min(box?.clientWidth || 120, 140);
    const actualSize = Math.max(size, 100);
    canvas.width = actualSize * dpr;
    canvas.height = actualSize * dpr;
    canvas.style.width = actualSize + 'px';
    canvas.style.height = actualSize + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, actualSize, actualSize);

    const cx = actualSize / 2;
    const cy = actualSize / 2;
    const radius = actualSize * 0.42;
    const innerRadius = actualSize * 0.28;
    const gap = 0.04; // white seam between slices

    let startAngle = -Math.PI / 2;
    const total = segments.reduce((acc, cur) => acc + cur.pct, 0) || 1;

    segments.forEach(seg => {
      const sliceAngle = Math.max((seg.pct / total) * Math.PI * 2 - gap, 0.02);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = seg.color;
      ctx.fill();

      startAngle = endAngle + gap;
    });

    if (centerTitle) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748B';
      ctx.font = `${Math.max(10, actualSize * 0.08)}px -apple-system, sans-serif`;
      ctx.fillText(centerTitle, cx, centerValue ? cy - 9 : cy);
    }
    if (centerValue) {
      ctx.fillStyle = '#1E293B';
      ctx.font = `bold ${Math.max(11, actualSize * 0.095)}px -apple-system, sans-serif`;
      ctx.fillText(centerValue, cx, cy + 10);
    }
  },

  // 3. 绘制 24小时 实时平滑曲线 (带渐变 Area)
  drawRealtimeCurve: function(canvasId, points) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const wrap = canvas.parentElement;
    const width = Math.max(Math.floor(wrap?.clientWidth || 280), 120);
    const height = 96;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    // 左右留足边距，避免刻度与数据点画出容器
    const pad = { top: 14, right: 22, bottom: 24, left: 22 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;

    const max = Math.max(...points) * 1.2 || 1;
    const stepX = w / (points.length - 1);

    const pts = points.map((val, i) => ({
      x: pad.left + i * stepX,
      y: pad.top + h - (val / max) * h
    }));

    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.top + h);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const cpX = (pts[i].x + pts[i + 1].x) / 2;
      ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, pad.top + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const cpX = (pts[i].x + pts[i + 1].x) / 2;
      ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
    }
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px -apple-system, sans-serif';
    const labels = ['00:00', '06:00', '12:00', '18:00', '24:00'];
    labels.forEach((lb, i) => {
      const x = pad.left + i * (w / 4);
      if (i === 0) ctx.textAlign = 'left';
      else if (i === labels.length - 1) ctx.textAlign = 'right';
      else ctx.textAlign = 'center';
      ctx.fillText(lb, x, height - 6);
    });
  },

  // 4. 绘制双折线图 (创作工具使用统计)
  drawToolsUsageChart: function(canvasId, dates, usageData, hoursData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = canvas.parentElement?.clientWidth || canvas.clientWidth || 300;
    const height = 100;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const pad = { top: 15, right: 15, bottom: 22, left: 15 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const stepX = w / (dates.length - 1);

    function drawLine(data, color) {
      const max = Math.max(...data) * 1.25;
      const pts = data.map((val, i) => ({
        x: pad.left + i * stepX,
        y: pad.top + h - (val / max) * h
      }));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const cpX = (pts[i].x + pts[i + 1].x) / 2;
        ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    drawLine(usageData, '#6366F1'); // 使用次数
    drawLine(hoursData, '#0EA5E9'); // 创作时长

    // 时间刻度
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    dates.forEach((d, i) => {
      ctx.fillText(d, pad.left + i * stepX, height - 6);
    });
  },

  // 5. 绘制微型迷你 Sparkline（渐变填充 + 端点）
  drawSparkline: function(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const width = Math.max(80, Math.floor((parent && parent.clientWidth) || canvas.clientWidth || 120));
    const height = 40;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length < 2) return;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const padX = 2;
    const padY = 6;
    const stepX = (width - padX * 2) / (data.length - 1);
    const stroke = color || '#6366F1';

    const pts = data.map((val, i) => ({
      x: padX + i * stepX,
      y: height - padY - ((val - min) / range) * (height - padY * 2)
    }));

    // 平滑路径（中点贝塞尔）
    const drawCurve = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const cpX = (pts[i].x + pts[i + 1].x) / 2;
        ctx.bezierCurveTo(cpX, pts[i].y, cpX, pts[i + 1].y, pts[i + 1].x, pts[i + 1].y);
      }
    };

    // 底部渐变填充
    drawCurve();
    ctx.lineTo(pts[pts.length - 1].x, height);
    ctx.lineTo(pts[0].x, height);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, stroke + '33');
    fill.addColorStop(0.55, stroke + '14');
    fill.addColorStop(1, stroke + '00');
    ctx.fillStyle = fill;
    ctx.fill();

    // 描边
    drawCurve();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 终点高亮点
    const end = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(end.x, end.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();
  }
};

window.ChartEngine = ChartEngine;
