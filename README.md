# react-props
inject props to react component for high performance rendering

# demo

[todomvc](https://github.com/Lucifier129/Isomorphism-react-todomvc/tree/refer)

# 使用方法

## 第一步：使用 injectProps

```javascript
import React, { Component, PropTypes } from 'react'
import { injectProps } from 'react-props'

const ENTER_KEY = 13
const ESCAPE_KEY = 27

@injectProps()
export default class NewTodo extends Component {
	static propTypes = {
		addItem: PropTypes.func.isRequired
	}
	handleBlur = e => {
		this.checkInput(e.currentTarget)
	}
	handleKeyup = e => {
		let keyCode = e.keyCode
		if (keyCode === ENTER_KEY || keyCode === ESCAPE_KEY) {
			this.checkInput(e.currentTarget)
		}
	}
	checkInput(input) {
		let title = input.value
		if (title) {
			this.props.addItem(title)
			input.value = ''
		}
	}
	render() {
		return (
			<header id="header">
				<h1>todos</h1>
				<input
					id="new-todo"
					placeholder="What needs to be done?"
					onBlur={ this.handleBlur }
					onKeyUp={ this.handleKeyup } />
			</header>
			)
	}
}
```

## 第二步：编写 selector

selector 的作用是从 global state 中取出一份数据，合并到 react 组件的 props 属性。

```javascript
// selectors.js

export let NewTodo = (state, actions, props) => {
	return actions
}

export let Main = (state, actions, props) => {
	let { todos } = state
	return {
		...actions,
		isAllCompleted: !!todos.length && todos.every(item => item.status),
	}
}

export let Todos = (state, actions, props) => {
	let { todos, activeFilter } = state
	return {
		...actions,
		todos: todos.filter(todo => {
			switch (activeFilter) {
				case 'SHOW_ALL':
				return true

				case 'SHOW_ACTIVE':
				return !todo.status

				case 'SHOW_COMPLETED':
				return todo.status
			}
		})
	}
}
```

selector 函数前三个参数为固定的。

- state: 全局 state 数据
- actions: flux 的 actions 函数集
- props: 父组件传递过来的初始 props

## 第三步，去掉相关父组件手动传 props 的做法

```javascript
import React, { Component, PropTypes } from 'react'
import NewTodo from '../components/NewTodo'
import Main from '../components/Main'
import Filters from '../components/Filters'
import { injectProps } from 'react-props'

@injectProps()
export default class Root extends Component {
	render() {
		return (<div>
					<NewTodo /> // 裸组件
					<Main id="main" /> // 或者只传关键属性
					<Filters />
				</div>)
	}
}
```

## 第四步，编写 match 函数

match 函数响应 action 调用，返回需要更新的 selector 名

```javascript
import * as filter from './handlers/activeFilter'

let matcher = data => {
	let { key } = data
	switch (true) {
		case filter.hasOwnProperty(key):
			return ['Filters', 'Todos']
		default:
			return 'Root'
	}
}

export default matcher
```

## 第五步，设置 flux 配置

flux 配置让 react-props 能拿到必要的数据

```javascript
let store = createStore(handlerList)

let { getState, actions } = store

setFluxConfig({
	getState,
	actions,
	selectors,
	match
})
```

## 最后一步，侦听 action

如果你用 redux，则如下配置：

```javascript
reducer = bindReducer(reducer)
let store = createStore(reducer, initialState)
```

如果你用 [refer](https://github.com/Lucifier129/refer)，则如下配置:

```javascript
import { createStore } from 'refer'
import * as handlers from './handlers'
import { setFluxConfig, updater } from 'react-props'
import * as selectors from './selectors'
import match from './match'

let store = createStore([updater, handlers])

let { getState, actions } = store

setFluxConfig({
	getState,
	actions,
	selectors,
	match
})

export default store
```

如果你想手动处理，则：

```javascript
import { handleAction } from 'react-props'

let data = {
	type: 'ADD_TODO',
	text: 'text for todo'
}

handleAction(data) // match 函数将拿到这个 data
```

此外，不需要再做什么，视图会根据 match 函数的返回值做局部更新(当更新范围为 Root 组件时，也就相当于全局更新).

