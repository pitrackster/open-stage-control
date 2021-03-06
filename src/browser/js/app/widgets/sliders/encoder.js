var {clip, mapToScale} = require('../utils'),
    Knob = require('./knob'),
    _widgets_base = require('../common/_widgets_base'),
    doubletab = require('../mixins/double_tap')



var EncoderKnob = class extends Knob {
    draginitHandle(e, data, traversing) {

        this.percent = clip(this.percent,[0,100])

        this.lastOffsetX = data.offsetX
        this.lastOffsetY = data.offsetY

        if (!(traversing || this.getProp('snap'))) return

        this.percent = this.angleToPercent(this.coordsToAngle(data.offsetX, data.offsetY))

        this.setValue(this.percentToValue(this.percent), {send:true,sync:true,dragged:true, draginit:true})

    }
    mousewheelHandle(){}
}
var DisplayKnob = class extends Knob {

}

module.exports = class Encoder extends _widgets_base {

    static defaults() {

        return {
            type:'encoder',
            id:'auto',
            linkId:'',

            _geometry:'geometry',

            left:'auto',
            top:'auto',
            width:'auto',
            height:'auto',

            _style:'style',

            label:'auto',
            color:'auto',
            css:'',

            _encoder: 'encoder',

            ticks:360,
            back:-1,
            forth:1,
            release:'',
            snap:false,
            doubleTap:false,

            _osc:'osc',

            precision:2,
            address:'auto',
            touchAddress:'',
            preArgs:[],
            target:[]
        }

    }

    constructor(options) {

        var html = `
            <div class="encoder">
                <div class="wrapper">
                </div>
            </div>
        `
        super({...options, html: html})

        this.wrapper = this.widget.find('.wrapper')
        this.ticks = Math.abs(parseInt(this.getProp('ticks')))

        this.knob = new EncoderKnob({props:{
            label:false,
            angle:360,
            snap:true,
            range:{min:0,max:this.ticks},
            pips:false,
        }})

        this.knob.noDraw = true

        this.display = new DisplayKnob({props:{
            label:false,
            angle:360,
            range:{min:0,max:this.ticks},
            origin:this.ticks/2,
            pips:false,
        }})

        this.wrapper.append(this.knob.widget.addClass('drag-knob'))
        this.wrapper.append(this.display.widget.addClass('display-knob'))

        this.knob.setValue(this.ticks/2)
        this.display.setValue(this.ticks/2)

        this.previousValue = this.ticks/2

        this.wrapper.on('change',(e)=>{
            e.stopPropagation()

            var value = this.knob.getValue()

            var direction

            if (value < this.previousValue)
                direction = this.getProp('back')
            if (value > this.previousValue)
                direction = this.getProp('forth')

            if ((this.ticks * .75 < value && value < this.ticks) && (0 < this.previousValue && this.previousValue < this.ticks / 4))
                direction = this.getProp('back')
            if ((0 < value && value < this.ticks / 4) && (this.ticks * .75 < this.previousValue && this.previousValue < this.ticks))
                direction = this.getProp('forth')


            if (direction && (Math.round(value) != Math.round(this.previousValue))) this.setValue(direction, {sync:true, send:true, dragged: e.options.dragged, draginit: e.options.draginit})
            this.previousValue = value

        })

        this.wrapper.on('draginit', (e)=>{
            if (this.getProp('touchAddress') && this.getProp('touchAddress').length
                && e.target == this.wrapper[0])
                this.sendValue({
                    address:this.getProp('touchAddress'),
                    v:1
                })
        })

        this.wrapper.on('dragend', (e)=>{
            if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                this.knob.setValue(this.ticks/2)
                this.display.setValue(this.ticks/2)
                this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
            }
            if (this.getProp('touchAddress') && this.getProp('touchAddress').length
                && e.target == this.wrapper[0])
                this.sendValue({
                    address:this.getProp('touchAddress'),
                    v:0
                })
        })

        if (this.getProp('doubleTap')) {

            doubletab(this.wrapper, ()=>{
                    this.knob.setValue(this.ticks/2)
                    this.display.setValue(this.ticks/2)
                if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                    this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
                }
            })

        }

        this.wrapper.on('mousewheel', (e)=>{

            if (e.originalEvent.wheelDeltaX || e.originalEvent.wheelDelta == 0) return

            var direction = e.originalEvent.wheelDelta / Math.abs(e.originalEvent.wheelDelta)

            this.display.setValue(this.display.value + direction)
            this.setValue(direction < 0 ? this.getProp('back') : this.getProp('forth'), {sync:true, send:true})

            if (this.getProp('release') !== '' && this.value !== this.getProp('release')) {
                this.knob.setValue(this.ticks/2)
                this.display.setValue(this.ticks/2)
                this.setValue(this.getProp('release'), {sync:true, send:true, dragged:false})
            }
        })


    }

    setValue(v,options={}) {

        if (this.getProp('snap') || (!this.getProp('snap') && !options.draginit)) {

            var match = true

            if (v === this.getProp('back')) {
                this.value = this.getProp('back')
            } else if (v === this.getProp('forth')) {
                this.value = this.getProp('forth')
            } else if (v === this.getProp('release') && this.getProp('release') !== '') {
                this.value = this.getProp('release')
            } else {
                match = false
            }

        }

        if (options.sync && match) this.widget.trigger({type:'change',id:this.getProp('id'),widget:this, linkId:this.getProp('linkId'), options:options})
        if (options.send && match && !(!this.getProp('snap') && options.draginit)) this.sendValue()

        if (options.dragged || options.draginit) this.updateDisplay(options.draginit)

    }

    updateDisplay(init){

        if (this.getProp('snap')) {
            this.display.setValue(this.knob.value)
            return
        }

        if (init) {

            this.offset = this.knob.value - this.display.value

        } else {

            var v = this.knob.value - this.offset,
                updateOffset

            if (v > this.ticks) {

                v = this.ticks - v
                updateOffset = true


            } else if (v < 0) {

                v = v + this.ticks
                updateOffset = true

            }

            this.display.setValue(v)

            if (updateOffset) {
                this.offset = this.knob.value - this.display.value
            }
        }

        if (this.offset > this.ticks) this.offset = this.ticks - this.offset
        if (this.offset < 0) this.offset = this.offset + this.ticks

    }

}
