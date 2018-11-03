export default class GraphParser {
  constructor(graph, models) {
    this.graph = graph
    this.models = models
  }

  static map (graph, models) {
    return new this(graph, models).parse(graph)
  }

  parse (graph) {
    Object.entries(graph).forEach(([key, value]) => {
      graph[key] = this.parseEntry(value)
    })

    let object = graph.__typename !== undefined ? this.parseModel(graph) : graph

    delete object.__typename

    return object
  }

  parseCollection (collection) {
    let coll = []
    collection.forEach((item) => {
      if (item instanceof Object) {
        coll.push(this.parse(item))
      }
    })

    return coll
  }

  parseModel (attributes) {
    const model = this.models[attributes.__typename]

    try {
      return new model(attributes)
    } catch (e) {
      // if (attributes.__typename.includes('Paginator') == -1) {
      console.warn('Model not found: ' + attributes.__typename)
      // console.log(attributes)
      // }
      return attributes
    }
  }

  parseEntry (value) {
    if (value instanceof Object && !Array.isArray(value)) {
      return this.parseModel(value)
    }

    if (Array.isArray(value)) {
      return this.parseCollection(value)
    }
    return value
  }
}