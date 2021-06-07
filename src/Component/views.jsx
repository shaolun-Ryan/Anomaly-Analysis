import React, {Component} from 'react'
import axios from 'axios'


class Views extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }

    componentDidMount() {
        axios.get('data/1.json')
            .then(d=>{
                console.log(d)
            })
    }


    render() {
        return(
            <div className={'views'}>
                <div className="left">
                    <div className="job_detail bg-primary"></div>
                </div>
                <div className="right">
                    <div className="jobs bg-info"></div>
                    <div className="changes bg-warning"></div>
                </div>
            </div>
        )
    }
}

export default Views