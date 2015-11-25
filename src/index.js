import React from 'react'

let isType = type => obj => obj != null && Object.prototype.toString.call(obj) === `[object ${ type }]`
let isObj = isType('Object')
let isStr = isType('String')
let isNum = isType('Number')
let isFn = isType('Function')
let isRegExp = isType('RegExp')
let isArr = Array.isArray || isType('Array')
let isThenable = obj => obj != null && isFn(obj.then)


// state
let currentState = {}
let updateState = nextState => currentState = nextState

// selector
let currentSelectors = {}
let combineSelector = selector => {
	Object.keys(selector).forEach(key => {
		let item = selector[key]
		if (!isFn(item)) {
			return
		}
		currentSelectors[key] = (...args) => item(currentState, ...args)
	})
}

// update queue
let currentUpdaters = []
let addUpdater = name => {
	if (currentUpdaters.indexOf(name) === -1) {
		currentUpdaters.push(name)
	}
}
let addUpdaters = names => names.forEach(addUpdater)
let clearUpdater = () => {
	currentUpdaters.forEach(triggerEvent)
	currentUpdaters = []
}


// eventEmit
let currentEvents = {}

let addEvent = (name, update) => {
	if (!isArr(currentEvents[name])) {
		currentEvents[name] = []
	}
	currentEvents[name].push(update)
}

let removeEvent = (name, update) => {
	if (!isArr(currentEvents[name])) {
		return
	}
	currentEvents[name].filter(item => item !== update)
}

let triggerEvent = name => {
	if (!isArr(currentEvents[name])) {
		return
	}
	currentEvents[name].forEach(update => isFn(update) && update())
}

// configuration

let config = {}
let combineConfig = obj => {

}


let injectProps = (name, ...args) => Component => {
	selector = currentSelectors[name]
	return class injector extends React.Component {
		componentDidMount() {
			this.__update = () => this.forceUpdate()
			addEvent(selectorName, this.__update)
		},
		componentWillUnmount() {
			removeEvent(selectorName, this.__update)
		}
		shouldComponentUpdate() {
			return false
		}
		render() {
			let props = selector(this.props, ...args) || {}
			return <Component {...props} />
		}
	}
}



