pipeline {
  agent any
  stages {
    stage('Cloning Git') {
      steps {
        git 'https://github.com/dsirine/StretchShop.git'
      }
    }
    stage('Build') {
       steps {
        sh 'cd docker/micro'
        sh 'ls'
       }
    }
    stage('Test') {
      steps {
        sh 'docker-compose up'
      }
    }
  }
}
