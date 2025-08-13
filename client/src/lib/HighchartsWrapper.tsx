// client/src/lib/HighchartsWrapper.tsx
import Highcharts from './initHighcharts'; 
import HighchartsReact from 'highcharts-react-official';

interface HighchartsWrapperProps {
  options: Highcharts.Options;
}

export default function HighchartsWrapper({ options }: HighchartsWrapperProps) {
  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
    />
  );
}