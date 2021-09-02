import Picker from '../picker';
import TimePanel from '../panel/time';
import TimeRangePanel from '../panel/time-range';

export default {
  mixins: [Picker], // 混入了一个组件

  name: 'ElTimePicker',

  props: {
    isRange: Boolean, // 是否为时间范围选择，仅对<el-time-picker>有效
    arrowControl: Boolean // 是否使用箭头进行时间选择，仅对<el-time-picker>有效
  },

  data() {
    return {
      type: ''
    };
  },

  watch: {
    isRange(isRange) {
      // 
      if (this.picker) {
        this.unmountPicker(); 
        this.type = isRange ? 'timerange' : 'time';
        this.panel = isRange ? TimeRangePanel : TimePanel;
        this.mountPicker();
      } else {
        this.type = isRange ? 'timerange' : 'time';
        this.panel = isRange ? TimeRangePanel : TimePanel;
      }
    }
  },

  created() {
    // 
    this.type = this.isRange ? 'timerange' : 'time';
    this.panel = this.isRange ? TimeRangePanel : TimePanel;
  }
};
