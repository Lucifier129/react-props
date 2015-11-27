import React from 'react'

let isType = type => obj => obj != null && Object.prototype.toString.call(obj) === `[object ${ type }]`
let isObj = isType('Object')
let isStr = isType('String')
let isFn = isType('Function')
let isArr = Array.isArray || isType('Array')

// state
let $getState = () => {}
let $actions = {}
let $selectors = {}
let $component = {}
let $matcher

export let config = ({ getState, selectors, actions, matcher }) => {
	addSelector(selectors)
	$getState = getState
	$actions = actions
	$matcher = matcher
}

export let onAction = data => {
	if (!isFn($matcher)) {
		return
	}
	let result = $matcher(data)
	switch (true) {
		case isObj(result):
			let { name, callback } = result
			eachComponent(name, callback)
			break
		case isStr(result):
			renderCompoent(result)
			break
		case isArr(result):
			result.forEach(renderCompoent)
			break
	}
}

export let updater = {
	DID_UPDATE: data => {
		onAction(data)
		return data
	} 
}

export let bindReducer = reducer => {
	return (state, actions) => {
		let nextState = reducer(state, actions)
		onAction({
			state,
			actions
		})
		return nextState
	}
}

// selector
let addSelector = obj => {
	Object.keys(obj).forEach(key => {
		let query = obj[key]
		if (isFn(query)) {
			$selectors[key] = (props, ...args) => query($getState(), $actions, props, ...args)
		}
	})
}


let addComponent = (name, component) => {
	if (!isArr($component[name])) {
		$component[name] = []
	}
	$component[name].push(component)
}

let removeComponent = (name, component) => {
	if (!isArr($component[name])) {
		return
	}
	let index = $component.indexOf(component)
	if (index !== -1) {
		$component.splice(i, 1)
	}
}

let getComponent = name => {
	let components = $component[name]
	return isArr(components) ? components : []
}

let eachComponent = (name, fn) => {
	getComponent(name).forEach(fn)
}

let renderCompoent = name => {
	eachComponent(name, component => component.forceUpdate())
}

export let injectProps = (name, ...args) => Component => {
	name = name || Component.name
	class Injector extends React.Component {
		componentDidMount() {
			addComponent(name, this)
		}
		componentWillUnmount() {
			removeComponent(name, this)
		}
		render() {
			let selector = $selectors[name]
			let props = {}
			if (isFn(selector)) {
				props = selector(this.props, ...args)
			}
			return <Component {...this.props} {...props} />
		}
	}
	Object.defineProperties(Injector, {
		propTypes: {
			set(propTypes) {
				Component.propTypes = propTypes
			}
		},
		defaultProps: {
			set(defaultProps) {
				Component.defaultProps = defaultProps
			}
		}
	})
	return Injector
}