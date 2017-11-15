import React, {Component} from 'react';
import {getDay, addEvent, deleteEvent, eventDone, eventUndone, moveEvent, editEvent} from './../serverInteractions';
import * as cf from './../functions';
import Event from './Event';
import EventEdit from './EventEdit';
import EventAdd from './EventAdd';

export default class Day extends Component {
	constructor(props) {
		super(props);
		this.state = {
			editingEventIndex: null,

			addingEventIndex: null
		}
	}

	componentDidMount() {
		this.getAndSetDay();
	}
	componentDidUpdate(prevProps) {
		if(prevProps.date.selected !== this.props.date.selected) {
			this.getAndSetDay();
		}
	}



	getAndSetDay() {
		const handleDayData = (data) => {
			let day = cf.buildInitialDayCells(this.props.date.selected);
			if(data.response !== 'no events was found') {
				for(let i = 0; i < data.data.length; i++) {
					let date = new Date(data.data[i].start * 1000);
					let index = Math.floor((date.getUTCHours() * 60 + date.getUTCMinutes()) / 10);
					day[index] = {...day[index], ...data.data[i]};
				}
			}
			this.props.setDay(day);
		}
		getDay(
			Math.floor(this.props.date.selected / 1000),
			this.props.user.token,
			handleDayData
		);
	}



	finishEventMove = newTime => {
		moveEvent(
			this.props.user.token,
			this.props.data.movingEvent.event.id,
			newTime / 1000,
			this.getAndSetDay.bind(this)
		);
		this.props.setMovingEvent(null);
		this.props.movingEventOff();
	}

	startEventMove = (key, event) => {
		this.props.setMovingEvent({key: key, event: event});
		this.props.movingEventOn();
	}



// ADD
	startEventAdd = i => {
		if(!this.state.movingEventId) {
			this.setState({addingEventIndex: i});
		}
	}
	cancelEventAdd = () => {
		this.setState({addingEventIndex: null});
	}
	submitEventAdd = adds => {
		if(adds.start > 0 && adds.dur > 0 && adds.idea.length > 0) {
			addEvent(
				this.props.user.token,
				{
					start: adds.start,
					dur: adds.dur,
					idea: adds.idea
				},
				this.getAndSetDay.bind(this)
			);
			this.cancelEventAdd();
		} else {
			throw new Error(`\n\nWrong adds:\n start: ${adds.start}\n dur:   ${adds.dur}\n idea:  ${adds.idea}\n`);
		}
	}

// EDIT
	startEventEdit = i => {
		this.setState({editingEventIndex: i});
	}
	cancelEventEdit = () => {
		this.setState({editingEventIndex: null});
	}
	submitEventEdit = edits => {
		if(edits.id.length > 0 && edits.dur > 0 && edits.idea.length > 0) {
			editEvent(
				this.props.user.token,
				{
					id: edits.id,
					dur: edits.dur,
					idea: edits.idea
				},
				this.getAndSetDay.bind(this)
			);
			this.cancelEventEdit();
		} else {
			throw new Error(`\n\nWrong edits:\n id:   ${edits.id}\n dur:  ${edits.dur}\n idea: ${edits.idea}\n`);
		}
	}

// REMOVE
	removeEvent = id => {
		if(typeof id !== 'string' && id.length === 0) throw new Error(`\n\nWrong removing id:\n id: ${id}\n`);

		deleteEvent(
			this.props.user.token,
			id,
			this.getAndSetDay.bind(this)
		);
		this.setState({addingEventIndex: null});
	}

// DONE
	setEventStatusDone = id => {
		if(typeof id !== 'string' && id.length === 0) throw new Error(`\n\nWrong removing id:\n id: ${id}\n`);

		eventDone(
			this.props.user.token,
			id,
			this.getAndSetDay.bind(this)
		);
	}

// UNDONE
	setEventStatusUndone = id => {
		if(typeof id !== 'string' && id.length === 0) throw new Error(`\n\nWrong removing id:\n id: ${id}\n`);

		eventUndone(
			this.props.user.token,
			id,
			this.getAndSetDay.bind(this)
		);
	}



	render() {
		
		if(!this.props.data.day) return <div>loading...</div>;

		let dayCells = [];
		let gap = 0;

		for(let i = 0; i < 144; i++) {
			let {hours, minutes, time} = this.props.data.day[i];
			let cell = this.props.data.day[i];

			if(
				cell.id && cell.id !== this.state.movingEventId &&
				this.state.editingEventIndex === null
			) {

				dayCells[i] = (
					<Event
						key={i}
						i={i}
						event={cell}
						removeEvent={this.removeEvent}
						setEventStatusDone={this.setEventStatusDone}
						setEventStatusUndone={this.setEventStatusUndone}
						moveEvent={this.startEventMove}
						startEventEdit={this.startEventEdit}
					/>
				);

				i += +cell.dur / 10 - 1;
				let endMinutes = hours * 60 + minutes + +cell.dur;
				gap = (endMinutes - (Math.floor(endMinutes / 60) * 60)) / 10;
				
			} else if(
				this.state.addingEventIndex === i &&
				this.state.editingEventIndex === null
			) {

// EVENT ADD

				dayCells[i] = (
					<EventAdd
						key={i}
						i={i}
						event={cell}
						day={this.props.data.day}
						cancelEventAdd={this.cancelEventAdd}
						submitEventAdd={this.submitEventAdd}
					/>
				);

				let endMinutes = hours * 60 + minutes + 10;
				gap = (endMinutes - (Math.floor(endMinutes / 60) * 60)) / 10;

			} else if(this.state.editingEventIndex === i) {

// EVENT EDIT

				dayCells[i] = (
					<EventEdit
						key={i}
						i={i}
						event={cell}
						day={this.props.data.day}
						cancelEventEdit={this.cancelEventEdit}
						submitEventEdit={this.submitEventEdit}
					/>
				);
				i += +cell.dur / 10 - 1;
				let endMinutes = hours * 60 + minutes + +cell.dur;
				gap = (endMinutes - (Math.floor(endMinutes / 60) * 60)) / 10;

			} else {

				let cls = gap === 0 ? 'cell' : `cell gap${gap}`;
				dayCells[i] = (
					<div
						key={i}
						className={cls}
						onClick={
							() => {
								if(this.props.data.movingEvent) {
									this.finishEventMove(time);
								} else {
									this.startEventAdd(i);
								}
							}
						}
					>
						{cf.formatHoursMinutes(hours, minutes)}
					</div>
				)
				gap = 0;
			}
		}



		return (
			<div className='day'>
				<div className="days-cells">
					{dayCells}
				</div>
			</div>
		);
	}
};
