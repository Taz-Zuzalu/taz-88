import React, { useState, useEffect, useRef } from "react"
import { useScreenshot } from "use-react-screenshot"
import axios from "axios"
import { useRouter } from "next/router"
import { useGenerateProof } from "../../hooks/useGenerateProof"
import ArtBoardComponent from "./View"

const { CHAINED_MODAL_DELAY, FACT_ROTATION_INTERVAL } = require("../../config/goerli.json")
const { FACTS } = require("../../data/facts.json")

export default function ArtBoard() {
    const [generateFullProof] = useGenerateProof()
    const [identityKey, setIdentityKey] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isComponentLoading, setIsComponentLoading] = useState(false)
    const [processingModalIsOpen, setProcessingModalIsOpen] = useState(false)
    const [eraseModalIsOpen, setEraseModalIsOpen] = useState(false)
    const [tool, setTool] = useState("pen")
    const [userSelectedTile, setUserSelectedTile] = useState(false)

    const [isDrawing, setIsDrawing] = useState(false)

    const [lines, setLines] = useState([])
    const [color, setColor] = React.useState("black")
    const [fillColor, setFillColor] = React.useState()

    const router = useRouter()

    const [selectedTile, setSelectedTile] = useState()
    const [tiles, setTiles] = useState([""])
    const [currentCanvas, setCurrentCanvas] = useState()

    const stageRef = useRef(null)
    const tilesRef = useRef()
    const canvasId = useRef(null)
    const runFetch = useRef(false)

    const canvasRef = useRef(null)
    const borderRef = useRef(null)
    const [image, takeScreenShot] = useScreenshot({})
    const [steps, setSteps] = useState([])
    const [fact, setFact] = useState(FACTS[Math.floor(Math.random() * FACTS.length)])

    useEffect(() => {
        let tilesTemp
        let selectedTileTemp
        let identityKeyTemp = ""
        if (identityKeyTemp === "") {
            identityKeyTemp = window.localStorage.getItem("identity")
            setIdentityKey(identityKeyTemp)
            // setIsMember(true)
        }
        const fetchData = async () => {
            setIsComponentLoading(true)

            if (runFetch.current === false) {
                try {
                    const result = await axios.get("/api/modifyCanvas")

                    tilesTemp = result.data.canvas.tiles
                    canvasId.current = result.data.canvas.canvasId
                    setCurrentCanvas(result.data.canvas.canvasId)

                    const remainingIndices = []

                    for (let i = 0; i < tilesTemp.length; i++) {
                        if (tilesTemp[i] === "") {
                            remainingIndices.push(i)
                        }
                    }

                    selectedTileTemp = remainingIndices[Math.floor(Math.random() * (remainingIndices.length - 1))] || 0

                    setTiles(tilesTemp)
                    tilesRef.current = tilesTemp
                    setSelectedTile(selectedTileTemp)
                    setIsComponentLoading(false)
                } catch (err) {
                    console.log("Error with axios.get('/api/modifyCanvas')", err)
                }
            }
        }
        fetchData()
        return () => {
            runFetch.current = true
        }
    }, [])

    const handleUndo = () => {
        lines.pop()
        setLines(lines.concat())
    }

    const toggleTool = () => {
        if (tool === "pen") {
            setFillColor(color)
            setTool("fill")
        } else {
            setTool("pen")
        }
    }

    const startDrawing = (i) => {
        // if no tile is currently selected, allow selection of any empty tile
        // if tile is selected, only allow selection of selected tile
        if ((userSelectedTile === false) & !tiles[i]) {
            setSelectedTile(i)
            setUserSelectedTile(true)
            setIsDrawing(true)
        } else if (selectedTile === i) {
            setIsDrawing(true)
        } else {
            console.log("you can't select that tile")
        }
    }

    const minimize = () => {
        const uri = stageRef.current.toDataURL()
        tiles[selectedTile] = uri
        setUserSelectedTile(true)
        setIsDrawing(false)
    }

    const handleColorSelect = (e) => {
        if (tool === "fill") {
            setFillColor(e.target.id)
            setColor(e.target.id)
        } else {
            setColor(e.target.id)
        }
    }

    const generateCanvasUri = async () => await takeScreenShot(canvasRef.current)

    const internalCloseProcessingModal = () => {
        setProcessingModalIsOpen(false)
    }

    const closeProcessingModal = () => {
        setProcessingModalIsOpen(true)
    }

    const openProcessingModal = () => {
        setProcessingModalIsOpen(true)
    }

    const cancelEraseModal = () => {
        setEraseModalIsOpen(false)
    }

    const acceptEraseModal = () => {
        setEraseModalIsOpen(false)
        tiles[selectedTile] = ""
        setSelectedTile(null)
        setUserSelectedTile(false)
        handleClear()
    }

    const openEraseModal = () => {
        setEraseModalIsOpen(true)
    }

    const submit = async (event) => {
        event.preventDefault()
        // removeBorder
        // borderRef.current.className = 'touch-none bg-white h-[250] w-[250]'

        // const uri = stageRef.current.toDataURL()
        // tilesRef.current[selectedTile] = uri.toString()

        const tilesRemaining = tilesRef.current.filter((x) => x === "")

        let canvasUri
        if (tilesRemaining.length === 0) {
            setSelectedTile(-1)
            canvasUri = await generateCanvasUri()
        }

        // Should be renamed. This is for Posting data not loading.
        // setIsLoading(true)
        setTimeout(openProcessingModal, CHAINED_MODAL_DELAY)

        setSteps([
            { status: "processing", text: "Generating zero knowledge proof" },
            { status: "queued", text: "Verify ZKP membership and submit transaction" },
            { status: "queued", text: "Add art to active canvas" }
        ])
        const signal = "proposal_1"
        const { fullProofTemp, solidityProof, nullifierHash, externalNullifier, merkleTreeRoot, groupId } =
            await generateFullProof(identityKey, signal)
        // axios POSTs
        console.log("POSTING to /api/modifyCanvas:")
        console.log("tilesRef.current: ", tilesRef.current)
        console.log("canvasId.current: ", canvasId.current)

        // const response = await axios.post('/api/modifyCanvas', {
        //   updatedTiles: tilesRef.current,
        //   tileIndex: selectedTile,
        //   canvasId: canvasId.current
        // })
        // console.log('RESPONSE FROM /api/modifyCanvas:')
        // console.log(response)

        // if (response.status === 201) {
        //   router.push('/artGallery-page')
        // } else if (response.status === 203) {
        //   alert('Tile already exists, please submit another Tile')
        //   setIsLoading(false)
        // }

        try {
            setSteps([
                { status: "complete", text: "Generated zero knowledge proof" },
                { status: "processing", text: "Verifying ZKP membership and submitting transaction" },
                { status: "queued", text: "Add art to active canvas" }
            ])

            const response = await axios.post("/api/modifyCanvas", {
                updatedTiles: tilesRef.current,
                tileIndex: selectedTile,
                canvasId: canvasId.current,
                fullProof: fullProofTemp
            })
            if (response.status === 201 && tilesRemaining.length > 0) {
                
                setTimeout(() => {
                    internalCloseProcessingModal()
                    router.push("/artGallery-page")
                }, 3000)
            }
        } catch (error) {
            alert(
                "Error: someone submitted their drawing to this tile before you. Don’t worry, your drawing is saved! It will be applied to the next tile you select."
            )
            console.log("error", error)
            console.log("data", error.response.data.existingTile)
            tiles[selectedTile] = error.response.data.existingTile
            // setIsLoading(false)
            internalCloseProcessingModal()
            setUserSelectedTile(false)
            setSelectedTile(null)
        }

        if (tilesRemaining.length === 0) {
            const body = {
                imageUri: canvasUri,
                canvasId: canvasId.current,
                fullProof: fullProofTemp
            }
            console.log("POSTING to /api/mintFullCanvas")
            console.log("canvasUri: ", canvasUri)
            console.log("canvasId.current: ", canvasId.current)


            // Add Try and Catch
            const mintResponse = await axios.post("/api/mintFullCanvas", body)

            console.log("RESPONSE FROM /api/mintFullCanvas:", mintResponse)
            console.log("Canva Uri", mintResponse.ipfsUrl, mintResponse.imageId)

            const newCanvas = {
                id: 10000,
                imageId: mintResponse.data.imageId,
                timestamp: 999999999,
                tokenId: 0,
                uri: mintResponse.data.ipfsUrl,
                canvaUri: canvasUri
            }
            if (mintResponse.status === 201) {
                window.localStorage.setItem("savedCanva", JSON.stringify(newCanvas))
                console.log("Image Saved!", newCanvas)
                setSteps([
                    { status: "complete", text: "Generated zero knowledge proof" },
                    { status: "complete", text: "Verified ZKP membership and submitted transaction" },
                    {
                        status: "complete",
                        text: "Your drawing completed a canvas! Check out your freshly-baked creation in the TAZ app!"
                    }
                ])
                setTimeout(() => {
                    internalCloseProcessingModal()
                    router.push("/artGallery-page")
                }, 4000)
            } else if (mintResponse.status === 403) {
                alert("Tx have failed, please try submitting again")
            }
        } else {
            setSteps([
                { status: "complete", text: "Generated zero knowledge proof" },
                { status: "complete", text: "Verified ZKP membership and submitted transaction" },
                {
                    status: "complete",
                    text: "Your drawing is live on an active canvas! Check it out on the TAZ TV."
                }
            ])
        }
    }

    const handleClear = () => {
        setFillColor("white")
        setLines([])
    }

    const handleStartOver = () => {
        openEraseModal()
    }

    // const closeProcessingModal = () => {
    //     setIsLoading(false)
    // }

    const rotateFact = () => {
        setFact(FACTS[FACTS.indexOf(fact) + 1 === FACTS.length ? 0 : FACTS.indexOf(fact) + 1])
    }

    useEffect(() => {
        setTimeout(rotateFact, FACT_ROTATION_INTERVAL)
    }, [fact])

    // const handleGenerateProof = async () => {
    //   const { fullProofTemp, solidityProof, nullifierHashTemp, externalNullifier, signal, merkleTreeRoot, groupId } =
    //     await generateFullProof(identityKey)
    //   console.log('fullProof', fullProofTemp)
    //   console.log('solidityProof', solidityProof)
    //   console.log('nullifierHashTemp', nullifierHashTemp)
    //   console.log('externalNullifier', externalNullifier)
    //   console.log('merkleTreeRoot', merkleTreeRoot)
    //   console.log('groupId', groupId)
    //   console.log('signal', signal)
    // }

    return (
        <ArtBoardComponent
            isLoading={isLoading}
            isComponentLoading={isComponentLoading}
            startDrawing={startDrawing}
            isDrawing={isDrawing}
            submit={submit}
            canvasRef={canvasRef}
            borderRef={borderRef}
            selectedTile={selectedTile}
            setSelectedTile={setSelectedTile}
            tiles={tiles}
            lines={lines}
            setLines={setLines}
            stageRef={stageRef}
            handleUndo={handleUndo}
            toggleTool={toggleTool}
            handleColorSelect={handleColorSelect}
            tool={tool}
            color={color}
            fillColor={fillColor}
            setColor={setColor}
            setFillColor={setFillColor}
            minimize={minimize}
            handleStartOver={handleStartOver}
            userSelectedTile={userSelectedTile}
            openProcessingModal={processingModalIsOpen}
            closeProcessingModal={closeProcessingModal}
            openEraseModal={openEraseModal}
            cancelEraseModal={cancelEraseModal}
            acceptEraseModal={acceptEraseModal}
            eraseModalIsOpen={eraseModalIsOpen}
            steps={steps}
            fact={fact}
            currentCanvas={currentCanvas}
            handleClear={handleClear}
        />
    )
}
