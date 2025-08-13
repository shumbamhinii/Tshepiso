// src/lib/highcharts-config.js

import Highcharts from 'highcharts';
import more from 'highcharts/highcharts-more';
import packedbubble from 'highcharts/modules/packedbubble';
import treemap from 'highcharts/modules/treemap';
import sunburst from 'highcharts/modules/sunburst';

// Initialize the 'more' module first, as it's a prerequisite for many other modules
more(Highcharts);

// Then initialize the rest of the modules
packedbubble(Highcharts);
treemap(Highcharts);
sunburst(Highcharts);

export default Highcharts;