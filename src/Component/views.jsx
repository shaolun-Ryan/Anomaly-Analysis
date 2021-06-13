import React, {Component} from 'react'
import axios from 'axios'
import * as d3 from 'd3'
import * as echarts from 'echarts'
import $ from 'jquery'


class Views extends Component {
    constructor(props) {
        super(props);
        this.state = {
            width:600,
            height:600,


            raw_data: [],
            stratify: [],
            time: 39600,
            time_data : []//该时刻下所有拼合好的node数据
        }

    }
    
    
    /*预处理函数，根据选定的时戳来截取数据*/
    preprocess=(data)=>{
        let time = this.state.time

        let arr_ = d3.csvParseRows(data, function(d){
            return {
                timestamp: +d[0] || 0,
                job_id: d[1] || 0,
                task_id: d[2] || 0,
                machineID: d[3] || 0,
                util_cpu: +d[4] || 0,
                util_mem: +d[5] || 0,
                util_disk: +d[6] || 0,
                load_1: +d[7] || 0,
                load_5: +d[8] || 0,
                load_15: +d[9] || 0,
                radius:2,
            }
        })

        let arr = []

        arr_.forEach(d=>{
            if(d.timestamp===time){
                arr.push(d)
            }
        })

        return arr;
    }
    
    /*格式化函数*/
    format=(arr)=>{
        let width = 600, height = 600
        let stratify
        /*data = d3.csvParse(data)

        let stratify = d3.stratify().id(d => d.id)
            .parentId(d => d.id.substring(0, d.id.lastIndexOf(".")))(data)
        console.log('stratify', stratify)

        let hierarchy = d3.hierarchy(stratify).sum(d=>d.data.real_cpu_avg)
        console.log('hierarchy',hierarchy)

        return*/





        /*声明最终的tree*/
        let tree = [
            {"name":"root", "parent":"","value":null}
        ]


        /*格式化job级*/
        let jobs = arr.reduce((prev,cur)=>{
            if(!prev.includes(cur.job_id)){
                prev.push(cur.job_id)
                return prev
            }
            return prev
        },[])
        jobs.forEach(d=>{
            tree.push({
                name:d,
                parent:"root",
                value:null
            })
        })

        /*格式化task级*/
        let tasks = []
        jobs.forEach(job=> {
            let task_arr = arr.filter(item => item.job_id == job)
            let task = task_arr.reduce((prev,cur)=>{
                if(!prev.includes(cur.task_id)){
                    prev.push(cur.task_id)
                    return prev
                }
                return prev
            },[])
            task.forEach(d=>{
                d = `${job}$${d}`
                tasks.push(d)

                tree.push({
                    name: d,
                    parent: job,
                    value:null
                })
            })
        })


        /*格式化node级*/
        tasks.forEach(item=> {
            let task = item.split('$')[1], job = item.split('$')[0]
            let node_arr = arr.filter(item=>(item.job_id==job && item.task_id==task))
            node_arr.forEach(node=>{
                tree.push({
                    name: node.machineID,
                    parent: item,
                    ...node
                })
            })
        })

        // console.log(tree)


        stratify  = d3.stratify()
            .id(d=>d.name)
            .parentId(d=>d.parent)
            (tree)
        
        this.setState({
            stratify: stratify
        })

        // console.log('stratify', stratify)
        // console.log("hierarchy",d3.hierarchy(stratify).sum(d=>d.data.radius).sort((a, b) => b.data.radius - a.data.radius))

        let time_data = d3.hierarchy(stratify).sum(d=>d.data.radius).sort((a, b) => b.data.radius - a.data.radius)

        /*更改state*/
        this.setState({
            time_data:time_data
        })

        return time_data


    }

    /*画图函数*/
    draw=(root)=>{
        d3.select('.jobs').selectAll('*').remove()


        let width = this.state.width
        let height = this.state.height
        let stratify = this.state.stratify


        let data = d3.pack()
            .size([width, height])
            .padding(2)
            // .radius(d=>d.data.data.real_cpu_max)
            (root)

        console.log('pack',data)

        /*设置颜色插值器*/
        function colorNode(d){
            let num = Math.ceil(d/10)
            let color = ['#2985c5','#2985c5','#4cba73','#83c44f','#b4d44f','#eedd4e','white','#e8a181','#ae4432','#7b3031']
            return color[num-1]
        }


        const color = d3.scaleLinear()
            .domain([0, 2])
            .range(["#fff", "#eff0f1"])

        // const colorNodeCPU = d3.schemeSpectral[100]



        /*创建画布*/
        const svg = d3.select('.jobs')
            .append('svg')
            .attr('width',width)
            .attr('height',height)
            // .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
            .style("background", 'white')
            .style("cursor", "pointer")



        const node = svg.append('g')
            // .attr('transform', `translate(${width/2},${height/2})`)
            .selectAll('circle')
            .data(root.descendants().slice(1))
            .enter()
            .append('circle')
            .attr('class',d=>d.children?null:`node_${d.data.data.machineID}_outer`)
            .attr("transform", d => `translate(${d.x },${d.y})`)
            .attr("fill", d => d.children ? color(d.depth) : colorNode(d.data.data.util_disk))
            .attr("r", d => d.r)
            .on('click',function (d){
                update_load_change_view(d)
                // update_metrics_bubble_chart(d, stratify)
                update_temporal_line_chart(d)
            })
        node.append('title')
            .text(d=>d.children?`job_${d.data.data.name}`:`machine_${d.data.data.machineID}`)


        const node2 = svg.append('g')
            // .attr('transform', `translate(${width/2},${height/2})`)
            .selectAll('circle')
            .data(root.leaves().slice(1))
            .enter()
            .append('circle')
            .attr('class',d=>d.children?null:`node_${d.data.data.machineID}_middle`)
            .attr("transform", d => `translate(${d.x },${d.y})`)
            .attr("fill", d =>colorNode(d.data.data.util_mem))
            .attr("r", d => 2* d.r/3)
            .on('click',function (d){
                update_load_change_view(d)
                // update_metrics_bubble_chart(d, stratify)
                update_temporal_line_chart(d)
            })
        node.append('title')
            .text(d=>`machine_${d.data.data.machineID}`)


        const node3 = svg.append('g')
            // .attr('transform', `translate(${width/2},${height/2})`)
            .selectAll('circle')
            .data(root.leaves().slice(1))
            .enter()
            .append('circle')
            .attr('class',d=>d.children?null:`node_${d.data.data.machineID}_inner`)
            .attr("transform", d => `translate(${d.x },${d.y})`)
            .attr("fill", d => colorNode(d.data.data.util_cpu))
            .attr("r", d => d.r/3)
            .on('click',function (d){
                update_load_change_view(d)
                // update_metrics_bubble_chart(d, stratify)
                update_temporal_line_chart(d)
            })
            .on('mouseover',function(d){
                trigger_same_class_node(this)
            })
            .on('mouseout',function(){
                remove_same_class_node(this)
            })
        node.append('title')
            .text(d=>`machine_${d.data.data.machineID}`)


        /*添加job的标签*/
        let label = svg.append('g')
            .style("font", "12px sans-serif")
            .selectAll('text')
            .data(root.descendants())
            .enter()
            .append('text')
            .attr('transform',d=>`translate(${d.x},${d.y})`)
            .attr('x',d=>-d.r/10)
            .attr('y',d=>-d.r/1.5)
            .style("display", d => d.parent === root && d.r>80 && d.children.length>1 ? "inline" : "none")
            .text(d =>`job_${d.data.data.name}`);



        let trigger_same_class_node=(self)=>{
            if(!$(self).attr('class')){
                return /*不是叶子节点，退出*/
            }

            let classNameArr = $(self).attr('class').split('_')
            let className = `${classNameArr[0]}_${classNameArr[1]}`

            d3.selectAll(`.${className}_outer`)
                .each(d=>{
                    svg.append('circle')
                        .attr('class','new')
                        .attr("transform", `translate(${d.x},${d.y})`)
                        .attr("fill", colorNode(d.data.data.util_disk))
                        .attr("r", 12)
                })

            d3.selectAll(`.${className}_middle`)
                .each(d=>{
                    svg.append('circle')
                        .attr('class','new')
                        .attr("transform", `translate(${d.x},${d.y})`)
                        .attr("fill", colorNode(d.data.data.util_mem))
                        .attr("r", 8)
                })

            d3.selectAll(`.${className}_inner`)
                .each(d=>{
                    svg.append('circle')
                        .attr('class','new')
                        .attr("transform", `translate(${d.x},${d.y})`)
                        .attr("fill", colorNode(d.data.data.util_cpu))
                        .attr("r", 4)
                })
        }

        let remove_same_class_node=(self)=>{
            /*把所有新加上去的元素删掉*/
            d3.selectAll('.new').remove()
        }

        let update_load_change_view=(d)=>{
            echarts.init(document.getElementById('load-change-container')).clear()
            let myChart = echarts.init(document.getElementById('load-change-container'));

            const data = d.data
            const self = this

            if(data.children){
                throw 'Click child nodes instead of parent nodes'
                return
            }

            let option = {
                xAxis: {
                    type: 'category',
                    data: ['load_15', 'load_5', 'load_1']
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    data: [data.data.load_15,data.data.load_5,data.data.load_1],
                    type: 'line',
                    lineStyle:{
                        color:"#f58235"
                    },
                    label:{
                        show:false
                    }
                }]
            };

            myChart.setOption(option)
        }

        let update_metrics_bubble_chart=(d,dataPack)=>{
            if(d.depth!==3){
                return
            }

            d3.select('.metrics-bar-container').selectAll('*').remove()

            let metric = document.getElementById('select_metric').value

            let data = handle_data_for_metrics_bubble_chart(d,dataPack)

            function colorNode(d){
                let num = Math.ceil(d/10)
                let color = ['#2985c5','#2985c5','#4cba73','#83c44f','#b4d44f','#eedd4e','white','#e8a181','#ae4432','#7b3031']
                return color[num-1]
            }

            const color_ = d3.scaleLinear()
                .domain([-0.5,1])
                .range(["#fff", "#eff0f1"])

            /*创建画布*/
            const svg = d3.select('.metrics-bar-container')
                .append('svg')
                .attr('width',300)
                .attr('height',300)
                // .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
                .style("background", 'white')
                .style("cursor", "pointer")


            const node = svg.append('g')
                .selectAll('circle')
                .data(data.descendants())
                .enter()
                .append('circle')
                .attr("transform", d => `translate(${d.x},${d.y})`)
                .attr("fill", d => d.children ? color_(d.depth) : colorNode(d.data.data[`util_${metric}`]))
                .attr("r", d => d.r)
                .append('title')
                .text(d=>d.children?`job_${d.data.data.name}`:`machine_${d.data.data.machineID}`)




        }




        let handle_data_for_metrics_bubble_chart=(d,stratify)=>{
            let data;

            let job_id = d.parent.parent.data.data.name
            stratify.children.forEach(d=>{
                if(d.id===job_id){
                    data=d
                }
            })

            data = d3.hierarchy(data).sum(d=>d.data.radius).sort((a, b) => b.data.radius - a.data.radius)
            data = d3.pack()
                .padding(1)
                .size([300, 300])
                // .radius(d=>d.data.data.real_cpu_max)
                (data)

            return data;

        }

        let update_temporal_line_chart=(d)=>{
            d3.select('.metrics-bar-container').selectAll('*').remove()

            let margin={left:25, right:10, top:10, bottom:20}

            let widthSvg = 300, heightSvg = 200
            let widthChart = 300-margin.left-margin.right, heightChart = 200-margin.top-margin.bottom

            let svg = d3.select('.metrics-bar-container')
                .append('svg')
                .attr('width',widthSvg)
                .attr('height',heightSvg)
                .append('g')
                .attr('transform',`translate(${margin.left},${margin.top})`)


            /*绘制x轴*/
            let x = d3.scaleLinear()
                .domain([1,10])
                .range([0,widthChart])
            svg.append('g')
                .style('font-size','0.5em')
                .attr('transform', `translate(0,${heightChart})`)
                .call(d3.axisBottom(x))

            /*绘制y轴*/
            let y = d3.scaleLinear()
                .domain([1,100])
                .range([heightChart,0])
            svg.append('g')
                .style('font-size','0.5em')
                .call(d3.axisLeft(y))

            let sample = d3.range(10).map(d=>{
                return {
                    time:d+1,
                    value:Math.random()*100
                }
            })
            // console.log(sample)

            /*绘制曲线Line*/
            svg.append("path")
                .datum(handle_data_for_line_chart(d))
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(function(d) { return x(d.time) })
                    .y(function(d) { return y(d.value) })
                    .curve(d3.curveMonotoneX)//使连线平滑
                )


            /*构造生成数据的处理函数*/
            function handle_data_for_line_chart(d){

                let job_name = d.data.data.job_id
                let node_arr = []//用来储存所有当前timstamp下该job下所有 的nodes

                stratify.children.forEach(item=>{
                    if(item.id==job_name){
                        item.children.forEach(item_=>{
                            item_.children.forEach(item__=>{
                                node_arr.push(item__.id)
                            })
                        })
                    }
                })

                /*Here*/


                let sample = d3.range(10).map(d=>{
                    return {
                        time:d+1,
                        value:Math.random()*100
                    }
                })

                return sample

            }
        }

    }



    /*切换时戳触发*/
    update_timestamp=()=>{
        let timestamp = document.getElementById('select_timestamp').value
        this.setState({
            time: +timestamp
        })

        let promise = new Promise((resolve, reject)=>{
            let width = 600, height = 600
            let stratify

            let _data = this.preprocess(this.state.raw_data)
            let time_data = this.format(_data)
            this.setState({
                time_data: time_data
            })


            resolve()
        })

        promise.then(()=>{

            this.draw(this.state.time_data)
        })

    }

    

    componentDidMount() {
        let width = 600, height = 600
        let stratify
        
        axios.get('data/concat_rdn25.csv')
            .then(d=>{
                this.setState({
                    raw_data: d.data
                })
                return this.preprocess(d.data)
            })
            .then(d=>{
                return this.format(d)
            })
            .then(root=>{
                this.draw(this.state.time_data)
            })
    }


    render() {

        let option;
        option = d3.range(39600,48601,300).map(d=>{
            return <option value={d} key={d}>{d}</option>
        })


        return(
            <div className={'views'}>
                <div className="left">
                    <div className="jobs"></div>
                    <select id="select_timestamp" defaultValue="45000" onChange={this.update_timestamp}>
                        {option}
                    </select>
                </div>
                <div className="right">
                    <div className="load-change">
                        <div id="load-change-container" style={{ width: 300, height: 300 }}></div>
                    </div>
                    <div className="changes">
                        <div className="metrics-bar-container"></div>
                        <select id="select_metric" defaultValue="CPU">
                            <option value="cpu">CPU util</option>
                            <option value="mem">Memory util</option>
                            <option value="disk">Disk util</option>
                        </select>
                    </div>
                </div>
            </div>
        )
    }
}

export default Views