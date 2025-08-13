// client/src/lib/initHighcharts.ts
import Highcharts from 'highcharts';

// Core / required
import HighchartsMore from 'highcharts/highcharts-more';
import Exporting from 'highcharts/modules/exporting';
import ExportData from 'highcharts/modules/export-data';
import Accessibility from 'highcharts/modules/accessibility';

// Charts we actually use here
import Treemap from 'highcharts/modules/treemap';
//import PackedBubble from 'highcharts/modules/packed-bubble';

// (Optional extras – keep if you use them elsewhere)
import Sankey from 'highcharts/modules/sankey';
import DependencyWheel from 'highcharts/modules/dependency-wheel';
import Networkgraph from 'highcharts/modules/networkgraph';
import Streamgraph from 'highcharts/modules/streamgraph';
import Sunburst from 'highcharts/modules/sunburst';
import Variwide from 'highcharts/modules/variwide';
import SolidGauge from 'highcharts/modules/solid-gauge';
import Annotations from 'highcharts/modules/annotations';

// Init order
HighchartsMore(Highcharts);
Exporting(Highcharts);
ExportData(Highcharts);
Accessibility(Highcharts);

// Initialize the ones we need for ResultsTab
Treemap(Highcharts);
//PackedBubble(Highcharts);

// Optional extras
Sankey(Highcharts);
DependencyWheel(Highcharts);
Networkgraph(Highcharts);
Streamgraph(Highcharts);
Sunburst(Highcharts);
Variwide(Highcharts);
SolidGauge(Highcharts);
Annotations(Highcharts);

// Global options
Highcharts.setOptions({
  accessibility: { enabled: false },
  chart: { backgroundColor: 'transparent' },
});

// Debug: check the modules are present
if (import.meta.env.DEV) {
  /* eslint-disable no-console */
  console.log('[HC modules loaded]', {
    treemap: !!Highcharts.seriesTypes.treemap,
    packedbubble: !!Highcharts.seriesTypes.packedbubble,
  });
}

export default Highcharts;
