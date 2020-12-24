const { ApolloServer, gql } = require('apollo-server');
const { RESTDataSource } = require('apollo-datasource-rest');
const responsePromise = require('request-promise');
const options = { json: true };


class PremierLeagueAPI extends RESTDataSource {
    constructor() {
      super();
      this.baseURL = 'https://fantasy.premierleague.com/api';
    }

    getPlayer(id) {
      var players = this.getAllPlayers()
      return players.then(data => data.find(player => player.id === parseInt(id)))
    }

    getAllPlayers() {
      return responsePromise({ ...options, uri: `${this.baseURL}/bootstrap-static/` }).then(
        (json) => {
          return json.elements.map(player => (
            {"id": player.id,
            'firstName': player.first_name,
          'lastName': player.second_name,
          'goalsScored': player.goals_scored,
          'assists': player.assists,
          'totalPoints': player.total_points,
          'cost': player.now_cost/10,
          'teamID': player.team
          }));
        }
      ).catch(function(err){
         console.log(err)
         return([])
      });
   }

     getTeambyID(id){
       return responsePromise({ ...options, uri: `${this.baseURL}/bootstrap-static/` }).then(
         (json) => {
           const team = json.teams.find(team => team.id === parseInt(id))
           return {"id": team.id, "name": team.name}
         }
       );
    }

     getTeams(){
       return responsePromise({ ...options, uri: `${this.baseURL}/bootstrap-static/` }).then(
         (json) => {
           return json.teams.map(team => (
               {"id": team.id, "name": team.name}
           ))
         }
       );
    }

     getHistoryByID(id){
       return responsePromise({ ...options, uri: `${this.baseURL}/element-summary/${id}/` }).then(
         (json) => {
        var playerHistory = json.history
        playerHistory.value = parseInt(json.value)/10.0
        return playerHistory.map(game => {
            game.value = parseInt(game.value)/10.0
            return game
        })
      });
    }

     getFixturesByID(id){
       return responsePromise({ ...options, uri: `${this.baseURL}/element-summary/${id}/` }).then(
         (json) => {
           return json.fixtures

         })
    }

  }



// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  type Game{
    assists: Int
    bonus: Int
    bps: Int
    clean_sheets: Int
    creativity: String
    element: Int
    fixture: Int
    goals_conceded: Int
    goals_scored: Int
    ict_index: String
    influence: String
    kickoff_time: String
    minutes: Int
    opponent_team: Int
    own_goals: Int
    penalties_missed: Int
    penalties_saved: Int
    red_cards: Int
    round: Int
    saves: Int
    selected: Int
    team_a_score: Int
    team_h_score: Int
    threat: String
    total_points: Int
    transfers_balance: Int
    transfers_in: Int
    transfers_out: Int
    value: Float
    was_home: Boolean
    yellow_cards: Int
    opp_team: Team
  }

  type Fixture{
    code: Int
    difficulty: Int
    event: Int
    event_name: String
    finished: Boolean
    id: Int
    is_home: Boolean
    kickoff_time: String
    minutes: Int
    provisional_start_time: Boolean
    team_a: Int
    team_a_score: Int
    team_h: Int
    team_h_score: Int
    opp_team: Team
  }

  type Player {
    id: Int
    team: Team
    firstName: String!
    lastName: String!
    assists: Int
    goalsScored: Int
    totalPoints: Int
    cost: Float!
    teamID: Int
    history: [Game!]!
    fixtures: [Fixture!]!
  }

  type Team{
      id: Int
      name: String
      players: [Player]
  }

  type Query {
    player(id: ID!): Player
    players: [Player!]
    team(id: ID!): Team
    teams: [Team!]
  }

`;

  // Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
        player: (_source, { id }, { dataSources }) => {
            return dataSources.premierleagueAPI.getPlayer(id);
        },

        players: (_source, _, { dataSources }) => {
            return dataSources.premierleagueAPI.getAllPlayers();
        },

        team: (_source, { id }, { dataSources }) => {
            return dataSources.premierleagueAPI.getTeambyID(id);
        },
        teams: (_source, { id }, { dataSources }) => {
            return dataSources.premierleagueAPI.getTeams();
        }

    },

    Team: {
         players(parent, _, {dataSources}){
            const players = dataSources.premierleagueAPI.getAllPlayers();
            return players.filter(player => player.teamID === parent.id)
        }
    },

    Player: {
         history(parent, _, {dataSources}){
            return dataSources.premierleagueAPI.getHistoryByID(parent.id)
        },

         team(parent, _, {dataSources}){
            return dataSources.premierleagueAPI.getTeambyID(parent.teamID)
        },

         fixtures(parent, _, {dataSources}){
            return dataSources.premierleagueAPI.getFixturesByID(parent.id)
        },

    },

    Game: {
         opp_team(parent, _, {dataSources}){
            return dataSources.premierleagueAPI.getTeambyID(parent.opponent_team)
        },
    },

    Fixture: {
         opp_team(parent, _, {dataSources}){
            const opp_team_id = parent.is_home ? parent.team_a : parent.team_h
            return dataSources.premierleagueAPI.getTeambyID(opp_team_id)
        },
    }

  };

  // The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ typeDefs, resolvers,
    dataSources: () => {
        return {
          premierleagueAPI: new PremierLeagueAPI(),
        }}
});

// The `listen` method launches a web server.
server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
