import React, {Component} from 'react'
import './style.css'
import 'guans-style'

import Views from "./Component/views";


class App extends Component{
    render() {
        return (
            <div className="app">
                <Views></Views>
            </div>
        )
    }
}

export default App;
