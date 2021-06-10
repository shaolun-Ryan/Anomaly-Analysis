import React, {Component} from 'react'
import axios from 'axios'
import * as d3 from 'd3'
import * as echarts from 'echarts'
import $ from 'jquery'


class Views extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }

    }

    draw_jobs=()=>{
        let width = 600, height = 600
        /*格式化函数*/
        let format=(data)=>{
            /*data = d3.csvParse(data)

            let stragify = d3.stratify().id(d => d.id)
                .parentId(d => d.id.substring(0, d.id.lastIndexOf(".")))(data)
            console.log('stratify', stragify)

            let hierarchy = d3.hierarchy(stragify).sum(d=>d.data.real_cpu_avg)
            console.log('hierarchy',hierarchy)

            return*/


            let arr = d3.csvParseRows(data, function(d){
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
                    radius:3,
                }
            })

            // console.log(arr)

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


            let stratify  = d3.stratify()
                .id(d=>d.name)
                .parentId(d=>d.parent)
                (tree)

            // console.log('stratify', stratify)
            // console.log("hierarchy",d3.hierarchy(stratify).sum(d=>d.data.radius).sort((a, b) => b.data.radius - a.data.radius))

            return (
                d3.hierarchy(stratify).sum(d=>d.data.radius).sort((a, b) => b.data.radius - a.data.radius)
                )

        }

/*
        let format_1 = (data)=> {
            console.log(data)
            console.log(d3.hierarchy(data)
                .sum(d => d.data.value))

            return (
                d3.hierarchy(data)
                    .sum(d => d.data.value)
                    .sort((a, b) => b.value - a.value)
            )
        }
*/

        /*画图函数*/
        let draw=(root)=>{



            let data = d3.pack()
                .size([width, height])
                .padding(1)
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
                })
                // .on('mouseover',function(d){
                //     trigger_same_class_node(this)
                // })
                // .on('mouseout',function(){
                //     remove_same_class_node(this)
                // })
            node.append('title')
                .text(d=>`job_${d.data.data.machineID}`)


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
                })
                // .on('mouseover',function(d){
                //     trigger_same_class_node(this)
                // })
                // .on('mouseout',function(){
                //     remove_same_class_node(this)
                // })
            node.append('title')
                .text(d=>`job_${d.data.data.machineID}`)


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
                })
                .on('mouseover',function(d){
                    trigger_same_class_node(this)
                })
                .on('mouseout',function(){
                    remove_same_class_node(this)
                })
            node.append('title')
                .text(d=>`job_${d.data.data.machineID}`)


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

        }


        /*format_01.json*/
        /*1.csv*/
        /*flare.csv*/
        /*vis_demo_data_time_45000.csv*/
        axios.get('data/vis_demo_data_time_45000.csv')
            .then(d=>{
                return format(d.data)
            })
            .then(root=>{
                draw(root)
            })
    }

    

    componentDidMount() {
        this.draw_jobs()
    }


    render() {
        return(
            <div className={'views'}>
                <div className="left">
                    <div className="jobs"></div>
                </div>
                <div className="right">
                    <div className="load-change">
                        <div id="load-change-container" style={{ width: 300, height: 300 }}></div>
                    </div>
                    <div className="changes bg-warning"></div>
                </div>
            </div>
        )
    }
}

export default Views