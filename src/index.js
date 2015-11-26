import React from 'react'

let isType = type => obj => obj != null && Object.prototype.toString.call(obj) === `[object ${ type }]`
let isObj = isType('Object')
let isStr = isType('String')
let isFn = isType('Function')
let isArr = Array.isArray || isType('Array')


// state
let currentState = {}
export let updateState = (nextState, actionName) => {
	currentState = nextState
	triggerRenderByActionName(actionName)
}

// selector
let currentSelectors = {}
export let addSelector = selector => {
	Object.keys(selector).forEach(key => {
		let item = selector[key]
		if (!isFn(item)) {
			return
		}
		currentSelectors[key] = (...args) => item(currentState, ...args)
	})
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
	let index = currentEvents.indexOf(update)
	if (index !== -1) {
		currentEvents.splice(i, 1)
	}
}

let triggerEvent = name => {
	if (!isArr(currentEvents[name])) {
		return
	}
	currentEvents[name].forEach(update => isFn(update) && update())
}

// configuration

let config = {}
export let addConfig = obj => Object.assign(config, obj)

let triggerRenderByActionName = actionName => {
	let updaters = config[actionName]
	if (isArr(updaters)) {
		updaters.forEach(triggerEvent)
	}
}

export let injectProps = (name, ...args) => Component => {
	let selector = isFn(name) ? name : currentSelectors[name]
	let selectorName = isStr(name) ? name : Component.name
	return class Injector extends React.Component {
		componentDidMount() {
			this.__update = () => this.forceUpdate()
			addEvent(selectorName, this.__update)
		}
		componentWillUnmount() {
			removeEvent(selectorName, this.__update)
		}
		shouldComponentUpdate() {
			return false
		}
		render() {
			let props = selector(this.props, ...args)
			return <Component {...this.props} {...props} />
		}
	}
}